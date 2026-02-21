"use client";

import { useEffect, useRef, useState } from "react";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { get as getProjection, transform } from "ol/proj";
import OlMap from "ol/Map";
import View from "ol/View";
import BaseLayer from "ol/layer/Base";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import WebGLTileLayer from "ol/layer/WebGLTile";
import XYZ from "ol/source/XYZ";
import TileWMS from "ol/source/TileWMS";
import GeoTIFFSource from "ol/source/GeoTIFF";
import VectorSource from "ol/source/Vector";
import TileGrid from "ol/tilegrid/TileGrid";
import { createXYZ } from "ol/tilegrid";
import { defaults as defaultControls } from "ol/control";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import { Style, Stroke, Text, Fill } from "ol/style";
import { unByKey } from "ol/Observable";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import type { EventsKey } from "ol/events";
import { Card } from "@/components/ui/card";
import type { DatasetResponse, GraticuleSource, TileLayerSource } from "@/lib/datasets";
import {
  buildFileUrlFromTemplate,
  buildGeoTiffUrl,
  buildLegendJsonUrl,
  buildLegendMetaUrl,
  buildLegendUrl,
  buildTileUrl,
  isGraticuleSource,
} from "@/lib/datasets";
import { useLanguage } from "@/components/LanguageProvider";

interface MapViewerProps {
  dataset: DatasetResponse | null;
  activeDate: string;
  activeBaseLayer?: TileLayerSource;
  activeIceSource?: TileLayerSource;
  baseLayerUrl: string;
  iceLayerUrl: string;
  showCoastlines: boolean;
  showGraticule: boolean;
  onIceStatusChange?: (state: "idle" | "loading" | "ready" | "error") => void;
}

type GraticuleLayer = TileLayer<XYZ> | VectorLayer<VectorSource>;
type IceTileSource = XYZ | TileWMS | GeoTIFFSource;

const LAYER_Z_INDEX = {
  base: 10,
  ice: 20,
  coast: 30,
  graticule: 40,
} as const;

const pad2 = (value: number) => String(value).padStart(2, "0");

const shiftDateKey = (dateKey: string, days: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
};

const toExtent = (bounds: [[number, number], [number, number]]) =>
  [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]] as [
    number,
    number,
    number,
    number,
  ];

const createXyzSource = (
  url: string,
  attribution: string | undefined,
  tileGrid: TileGrid,
  projection: string,
  wrapX = false,
  reprojectionErrorThreshold?: number,
) =>
  new XYZ({
    url,
    tileGrid,
    projection,
    attributions: attribution ? [attribution] : undefined,
    wrapX,
    crossOrigin: "anonymous",
    transition: 0,
    reprojectionErrorThreshold,
  });

type LegendJsonResponse = {
  continuous?: {
    valueMin?: number;
    valueMax?: number;
    units?: string;
    variableName?: string;
    cmap?: { colorMapStrings?: string[] };
  };
};

type LegendMetaResponse = {
  units?: string;
  scaleRange?: [string, string] | string[];
};

const legendJsonCache = new Map<string, LegendJsonResponse>();
const legendMetaCache = new Map<string, LegendMetaResponse>();
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const ASI_GEOTIFF_LEGEND_GRADIENT = `linear-gradient(90deg,
  rgba(0, 0, 0, 0) 0%,
  #2ee6ff 8%,
  #2eff8f 24%,
  #d4ff39 42%,
  #ffb11f 62%,
  #ff4f32 82%,
  #ff2be0 100%
)`;

const THIN_ICE_LEGEND_GRADIENT = `linear-gradient(90deg,
  #2ee6ff 0%,
  #2eff8f 22%,
  #d4ff39 42%,
  #ffb11f 62%,
  #ff4f32 82%,
  #ffffff 100%
)`;

const buildGeoTiffStyle = (sourceId: string) => {
  if (sourceId === "bremenSmosSmapThinIceThickness") {
    const smosThicknessCm = ["band", 1];

    return {
      color: [
        "case",
        ["<", smosThicknessCm, 0],
        [0, 0, 0, 0],
        [">", smosThicknessCm, 50],
        [255, 255, 255, 0.98],
        [
          "interpolate",
          ["linear"],
          smosThicknessCm,
          0,
          [46, 230, 255, 0.35],
          5,
          [46, 255, 143, 0.5],
          10,
          [212, 255, 57, 0.65],
          20,
          [255, 177, 31, 0.8],
          30,
          [255, 111, 45, 0.9],
          40,
          [255, 79, 50, 0.95],
          50,
          [255, 255, 255, 0.98],
        ],
      ],
    };
  }

  return {
    color: [
      "case",
      [
        "all",
        [">", ["band", 1], 0],
        ["<=", ["band", 1], 100],
      ],
      [
        "interpolate",
        ["linear"],
        [
          "case",
          ["<=", ["band", 1], 1],
          ["*", ["band", 1], 100],
          ["band", 1],
        ],
        0,
        [0, 0, 0, 0],
        5,
        [46, 230, 255, 0.3],
        15,
        [46, 255, 143, 0.55],
        30,
        [212, 255, 57, 0.74],
        50,
        [255, 177, 31, 0.85],
        70,
        [255, 79, 50, 0.93],
        100,
        [255, 43, 224, 0.98],
      ],
      [0, 0, 0, 0],
    ],
  };
};

const resolveGraticuleSettings = (source: GraticuleSource, zoom: number) => {
  const match = source.zoomSteps?.find(
    (step) => zoom >= step.minZoom && (step.maxZoom === undefined || zoom <= step.maxZoom),
  );

  const latStep = match?.latStep ?? source.latStep;
  const lonStep = match?.lonStep ?? source.lonStep;
  const segmentStep = match?.segmentStep ?? source.segmentStep;
  const labelEveryLat = match?.labelEveryLat ?? source.labelEveryLat ?? latStep;
  const labelEveryLon = match?.labelEveryLon ?? source.labelEveryLon ?? lonStep;
  const dashArray = match?.dashArray ?? source.dashArray;
  const opacity = match?.opacity ?? source.opacity;
  const weight = match?.weight ?? source.weight;
  const poleGap = match?.poleGap ?? source.poleGap;

  return {
    latStep,
    lonStep,
    segmentStep,
    labelEveryLat,
    labelEveryLon,
    dashArray,
    opacity,
    weight,
    poleGap,
  };
};

const shouldLabel = (value: number, every: number | undefined) => {
  if (!Number.isFinite(every) || !every || every <= 0) return false;
  const ratio = value / every;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
};

const formatDegreeLabel = (value: number, kind: "lat" | "lon") => {
  const abs = Math.abs(value);
  let deg = Math.floor(abs + 1e-6);
  let min = Math.round((abs - deg) * 60);
  if (min === 60) {
    deg += 1;
    min = 0;
  }
  const dir =
    kind === "lat"
      ? value >= 0
        ? "N"
        : "S"
      : value >= 0
        ? "E"
        : "W";
  return `${deg}°${min}' ${dir}`;
};

const alignToStep = (value: number, step: number) => Math.ceil(value / step) * step;

const buildGraticuleVectorLayer = (
  source: GraticuleSource,
  projectionCode: string,
  zoom: number,
) => {
  const resolved = resolveGraticuleSettings(source, zoom);
  const latStep = Math.max(0.1, Math.abs(resolved.latStep));
  const lonStep = Math.max(0.1, Math.abs(resolved.lonStep));
  const segmentStep = Math.max(0.1, Math.abs(resolved.segmentStep));
  const labelEveryLat = resolved.labelEveryLat;
  const labelEveryLon = resolved.labelEveryLon;

  const poleGap = Math.max(0, Math.min(5, Math.abs(resolved.poleGap ?? 0.005)));
  const minLat = clamp(source.minLat, -89.999, 89.999);
  const maxLat = clamp(source.maxLat, minLat, 90 - poleGap);
  const parallelMaxLat = maxLat;

  const toMap = (lon: number, lat: number) =>
    transform([lon, lat], "EPSG:4326", projectionCode);

  const features: Feature[] = [];

  const latStart = alignToStep(minLat, latStep);
  const lonStart = alignToStep(-180, lonStep);

  const lonLineValues: number[] = [];
  for (let lon = lonStart; lon < 180; lon += lonStep) {
    lonLineValues.push(lon);
  }

  const latLineValues: number[] = [];
  for (let lat = latStart; lat <= parallelMaxLat + 1e-6; lat += latStep) {
    latLineValues.push(lat);
  }

  for (const lat of latLineValues) {
    const coords: number[][] = [];
    for (let lon = -180; lon <= 180; lon += segmentStep) {
      coords.push(toMap(lon, lat));
    }
    features.push(new Feature({ geometry: new LineString(coords) }));

    if (shouldLabel(lat, labelEveryLat)) {
      for (const lon of lonLineValues) {
        const lonMid = lon + lonStep / 2;
        const label = new Feature({
          geometry: new Point(toMap(lonMid, lat)),
          label: formatDegreeLabel(lat, "lat"),
        });
        features.push(label);
      }
    }
  }

  const latSegmentStarts: number[] = [];
  for (let lat = latStart; lat + latStep <= maxLat + 1e-6; lat += latStep) {
    latSegmentStarts.push(lat);
  }

  for (const lon of lonLineValues) {
    const coords: number[][] = [];
    for (let lat = minLat; lat <= maxLat + 1e-6; lat += segmentStep) {
      coords.push(toMap(lon, lat));
    }
    features.push(new Feature({ geometry: new LineString(coords) }));

    if (shouldLabel(lon, labelEveryLon)) {
      for (const lat of latSegmentStarts) {
        const latMid = lat + latStep / 2;
        const label = new Feature({
          geometry: new Point(toMap(lon, latMid)),
          label: formatDegreeLabel(lon, "lon"),
        });
        features.push(label);
      }
    }
  }

  const lineStyle = new Style({
    stroke: new Stroke({
      color: "rgba(255, 255, 255, 0.96)",
      width: resolved.weight ?? 1,
      lineDash: resolved.dashArray as number[] | undefined,
    }),
  });

  const zoomOut = zoom <= 2;
  const labelCache = new Map<string, Style>();
  const textFill = new Fill({ color: "rgba(255, 255, 255, 1.0)" });
  const textStroke = new Stroke({ color: "rgba(15, 23, 42, 0.25)", width: 0.5 });

  const layerOpacity = clamp(resolved.opacity ?? 1, 0, 1) * 1.0;

  const layer = new VectorLayer({
    source: new VectorSource({ features }),
    className: "graticule-layer",
    opacity: layerOpacity,
    style: (feature) => {
      const label = feature.get("label") as string | undefined;
      if (!label) return lineStyle;

      const key = `${label}-${zoomOut}`;
      const cached = labelCache.get(key);
      if (cached) return cached;

      const style = new Style({
        text: new Text({
          text: label,
          font: zoomOut ? "10px sans-serif" : "11px sans-serif",
          fill: textFill,
          stroke: textStroke,
        }),
      });
      labelCache.set(key, style);
      return style;
    },
  });

  return layer;
};

const isVectorGraticuleLayer = (
  layer: GraticuleLayer | null,
): layer is VectorLayer<VectorSource> =>
  !!layer && layer.getSource() instanceof VectorSource;

const isXyzLayer = (layer: GraticuleLayer | null): layer is TileLayer<XYZ> =>
  !!layer && layer.getSource() instanceof XYZ;

export default function MapViewer({
  dataset,
  activeDate,
  activeBaseLayer,
  activeIceSource,
  baseLayerUrl,
  iceLayerUrl,
  showCoastlines,
  showGraticule,
  onIceStatusChange,
}: MapViewerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<OlMap | null>(null);
  const tileGridRef = useRef<TileGrid | null>(null);
  const baseLayer = useRef<TileLayer<XYZ> | null>(null);
  const coastLayer = useRef<TileLayer<XYZ> | null>(null);

  const graticuleLayer = useRef<GraticuleLayer | null>(null);
  const iceLayer = useRef<BaseLayer | null>(null);
  const iceLayerSourceId = useRef<string | null>(null);
  const fileResolutionCacheRef = useRef(new Map<string, string | null>());
  const fileAvailabilityCacheRef = useRef(new Map<string, boolean>());
  const geoTiffSourceCacheRef = useRef(new Map<string, GeoTIFFSource>());
  const coastUrlRef = useRef<string | null>(null);
  const graticuleUrlRef = useRef<string | null>(null);
  const cursorCoordsRef = useRef<{ lat: number; lon: number } | null>(null);
  const [iceStatus, setIceStatus] = useState<{
    state: "idle" | "loading" | "ready" | "error";
    message?: string;
  }>({ state: "idle" });
  const [iceReloadToken, setIceReloadToken] = useState(0);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);

  const legendUrl =
    activeIceSource && activeDate ? buildLegendUrl(activeIceSource, activeDate) : "";
  const legendJsonUrl = activeIceSource ? buildLegendJsonUrl(activeIceSource) : "";
  const legendMetaUrl =
    activeIceSource && activeDate ? buildLegendMetaUrl(activeIceSource, activeDate) : "";
  const [legendImageOrientation, setLegendImageOrientation] = useState<"horizontal" | "vertical" | null>(
    null,
  );
  const legendOrientation = activeIceSource?.legendOrientation ?? legendImageOrientation;
  const [legendData, setLegendData] = useState<{
    gradient: string;
    min: number;
    max: number;
    units?: string;
    label?: string;
  } | null>(null);

  const { t } = useLanguage();

  const handleRetry = () => setIceReloadToken((value) => value + 1);
  const setLoadingStatus = () =>
    setIceStatus((prev) => (prev.state === "error" ? prev : { state: "loading" }));

  const overlayTileUrl = (
    overlay?: TileLayerSource | GraticuleSource,
    date: string | undefined = activeDate,
  ) => {
    if (!overlay || !date || isGraticuleSource(overlay)) return "";
    return buildTileUrl(overlay, date);
  };

  const buildProxyUrl = (url: string) =>
    `/api/proxy?url=${encodeURIComponent(url)}`;

  const resolveExistingFileUrl = async (
    source: TileLayerSource,
    requestedDate: string,
    requestedUrl: string,
  ) => {
    const resolutionCacheKey = `${source.id}:${requestedDate}`;
    if (fileResolutionCacheRef.current.has(resolutionCacheKey)) {
      return fileResolutionCacheRef.current.get(resolutionCacheKey) ?? null;
    }

    const checkCandidate = async (candidate: string) => {
      const cachedAvailability = fileAvailabilityCacheRef.current.get(candidate);
      if (cachedAvailability !== undefined) {
        return cachedAvailability;
      }

      try {
        const proxyUrl = buildProxyUrl(candidate);
        const response = await fetch(proxyUrl, { method: "HEAD" });
        if (response.ok) {
          fileAvailabilityCacheRef.current.set(candidate, true);
          return true;
        }

        if (response.status === 405 || response.status === 501) {
          const fallback = await fetch(proxyUrl, {
            method: "GET",
            headers: { Range: "bytes=0-0" },
          });
          if (fallback.ok || fallback.status === 206) {
            fileAvailabilityCacheRef.current.set(candidate, true);
            return true;
          }
          if ([403, 404, 410].includes(fallback.status)) {
            fileAvailabilityCacheRef.current.set(candidate, false);
          }
          return false;
        }

        if ([403, 404, 410].includes(response.status)) {
          fileAvailabilityCacheRef.current.set(candidate, false);
        }
      } catch {
        // network errors are not cached as permanent misses
      }

      return false;
    };

    const candidates: string[] = [];
    const lookbackDays = source.skipDateAvailabilityCheck
      ? Math.max(0, source.fileDateLookbackDays ?? 120)
      : 0;
    const seen = new Set<string>();
    const fallbackTemplates = source.fallbackUrlTemplates ?? [];

    for (let dayOffset = 0; dayOffset <= lookbackDays; dayOffset += 1) {
      const candidateDate =
        dayOffset === 0 ? requestedDate : shiftDateKey(requestedDate, -dayOffset);
      const primaryUrl =
        dayOffset === 0 ? requestedUrl : buildGeoTiffUrl(source, candidateDate);
      const fallbackUrls = fallbackTemplates.map((template) =>
        buildFileUrlFromTemplate(template, candidateDate),
      );
      const orderedForDate = [primaryUrl, ...fallbackUrls];

      for (const candidate of orderedForDate) {
        if (!candidate || seen.has(candidate)) continue;
        seen.add(candidate);
        candidates.push(candidate);
      }
    }

    for (const candidate of candidates) {
      if (await checkCandidate(candidate)) {
        fileResolutionCacheRef.current.set(resolutionCacheKey, candidate);
        return candidate;
      }
    }

    fileResolutionCacheRef.current.set(resolutionCacheKey, null);
    return null;
  };

  const resolveFileLegend = (source: TileLayerSource) => {
    if (source.id === "bremenAsiAmsr2Sic") {
      return {
        gradient: ASI_GEOTIFF_LEGEND_GRADIENT,
        min: 0,
        max: 100,
        units: "%",
        label: "Sea Ice Concentration",
      };
    }

    if (source.id === "bremenSmosSmapThinIceThickness") {
      return {
        gradient: THIN_ICE_LEGEND_GRADIENT,
        min: 0,
        max: 50,
        units: "cm",
        label: "Thin Ice Thickness",
      };
    }

    return null;
  };

  const resolveWmsProjection = (source: TileLayerSource, mapProjection: string) => {
    const supported = (source.wmsCrs ?? []).map((value) => value.toUpperCase());
    if (supported.length === 0 || supported.includes(mapProjection.toUpperCase())) {
      return mapProjection;
    }
    if (supported.includes("EPSG:4326") || supported.includes("CRS:84")) {
      return "EPSG:4326";
    }
    if (supported.includes("EPSG:3857")) {
      return "EPSG:3857";
    }
    return mapProjection;
  };

  const buildWmsParams = (source: TileLayerSource, date: string) => {
    const params: Record<string, string> = {
      LAYERS: source.layer,
      FORMAT: "image/png",
      TRANSPARENT: "true",
      VERSION: "1.3.0",
      STYLES: source.wmsDefaultStyle ?? "",
    };

    if (source.wmsPalette) {
      params.palette = source.wmsPalette;
    }
    if (source.wmsColorScaleRange) {
      params.colorscalerange = source.wmsColorScaleRange;
    }
    if (source.wmsNumColorBands) {
      params.numcolorbands = String(source.wmsNumColorBands);
    }
    if (source.wmsLogScale) {
      params.logscale = "true";
    }

    if (date && source.wmsTime !== false) {
      const today = new Date().toISOString().slice(0, 10);
      if (date <= today) {
        params.TIME = `${date}T12:00:00.000Z`;
      }
    }

    return params;
  };

  const resolveTileGrid = (projectionCode: string, tileSize: number | undefined) => {
    if (!dataset || !tileGridRef.current) return null;
    if (projectionCode === dataset.mapConfig.projection) {
      return tileGridRef.current;
    }
    if (projectionCode === "EPSG:4326") {
      const size = tileSize ?? 256;
      const extent: [number, number, number, number] = [-180, -90, 180, 90];
      const origin: [number, number] = [-180, 90];
      const maxZoom = 10;
      const baseResolution = 180 / size;
      const resolutions = Array.from({ length: maxZoom + 1 }, (_, z) => baseResolution / 2 ** z);
      return new TileGrid({
        extent,
        origin,
        resolutions,
        tileSize: size,
      });
    }
    const projection = getProjection(projectionCode);
    return createXYZ({
      extent: projection?.getExtent(),
      tileSize: tileSize ?? 256,
    });
  };

  useEffect(() => {
    onIceStatusChange?.(iceStatus.state);
  }, [iceStatus.state, onIceStatusChange]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !dataset) return;

    const projectionCode = dataset.mapConfig.projection;
    if (projectionCode !== "EPSG:4326") {
      proj4.defs(projectionCode, dataset.mapConfig.proj4);
      register(proj4);
    }

    const extent = toExtent(dataset.mapConfig.bounds);
    const projection = getProjection(projectionCode);
    if (projection) projection.setExtent(extent);

    const tileSize = projectionCode === "EPSG:4326" ? 256 : 512;
    const tileGrid = new TileGrid({
      origin: dataset.mapConfig.origin,
      resolutions: dataset.mapConfig.resolutions,
      extent,
      tileSize,
    });
    tileGridRef.current = tileGrid;

    const view = new View({
      projection: projectionCode,
      resolutions: dataset.mapConfig.resolutions,
      extent,
      minZoom: dataset.mapConfig.minZoom,
      maxZoom: dataset.mapConfig.maxZoom,
      center: [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2],
      zoom: dataset.mapConfig.initialZoom,
    });

    const map = new OlMap({
      target: mapRef.current,
      view,
      controls: defaultControls({ zoom: true, attribution: false }),
    });

    baseLayer.current = new TileLayer({
      source: createXyzSource("", undefined, tileGrid, projectionCode),
      opacity: 0.9,
      preload: 0,
      useInterimTilesOnError: true,
      className: "basemap-layer",
    });
    baseLayer.current.setZIndex(LAYER_Z_INDEX.base);
    map.addLayer(baseLayer.current);

    const coastSource = dataset.overlays.coastlines;
    coastLayer.current = new TileLayer({
      source: createXyzSource("", coastSource.attribution, tileGrid, projectionCode),
      opacity: coastSource.opacity,
      className: "coastline-layer",
      visible: showCoastlines,
    });
    coastLayer.current.setZIndex(LAYER_Z_INDEX.coast);
    map.addLayer(coastLayer.current);

    const graticuleSource = dataset.overlays.graticule;
    if (isGraticuleSource(graticuleSource)) {
      graticuleLayer.current = buildGraticuleVectorLayer(
        graticuleSource,
        projectionCode,
        view.getZoom() ?? dataset.mapConfig.initialZoom,
      );
      graticuleLayer.current.setVisible(showGraticule);
      graticuleLayer.current.setZIndex(LAYER_Z_INDEX.graticule);
      map.addLayer(graticuleLayer.current);
    } else {
      graticuleLayer.current = new TileLayer({
        source: createXyzSource("", graticuleSource.attribution, tileGrid, projectionCode),
        opacity: graticuleSource.opacity,
        className: "graticule-layer",
        visible: showGraticule,
      });
      graticuleLayer.current.setZIndex(LAYER_Z_INDEX.graticule);
      map.addLayer(graticuleLayer.current);
    }

    const zoomKey = view.on("change:resolution", () => {
      const graticule = dataset.overlays.graticule;
      if (!isGraticuleSource(graticule)) return;
      if (!isVectorGraticuleLayer(graticuleLayer.current)) return;

      const zoom = view.getZoom() ?? dataset.mapConfig.initialZoom;
      const rebuilt = buildGraticuleVectorLayer(graticule, projectionCode, zoom);
      graticuleLayer.current.setSource(rebuilt.getSource() as VectorSource);
      graticuleLayer.current.setStyle(rebuilt.getStyle() as any);
    });

    mapInstance.current = map;

    const updateCursorCoords = (coordinate: number[]) => {
      const [lon, lat] = transform(coordinate, projectionCode, "EPSG:4326");
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      const next = { lat: Number(lat.toFixed(3)), lon: Number(lon.toFixed(3)) };
      const prev = cursorCoordsRef.current;
      if (prev && prev.lat === next.lat && prev.lon === next.lon) return;
      cursorCoordsRef.current = next;
      setCursorCoords(next);
    };

    const handlePointerMove = (event: MapBrowserEvent<UIEvent>) => {
      updateCursorCoords(event.coordinate);
    };

    map.on("pointermove", handlePointerMove);
    const center = view.getCenter();
    if (center) {
      updateCursorCoords(center);
    }

    map.once("postrender", () => {
      map.getView().fit(extent, { size: map.getSize(), duration: 0 });
    });

    return () => {
      map.un("pointermove", handlePointerMove);
      map.setTarget(undefined);
      mapInstance.current = null;
      tileGridRef.current = null;
      baseLayer.current = null;
      coastLayer.current = null;
      graticuleLayer.current = null;
      iceLayer.current = null;
    };
  }, [dataset]);

  useEffect(() => {
    coastUrlRef.current = null;
    graticuleUrlRef.current = null;
  }, [dataset]);

  useEffect(() => {
    if (!dataset || !tileGridRef.current || !baseLayer.current) return;

    if (!baseLayerUrl) {
      baseLayer.current.setVisible(false);
      return;
    }

    const sourceProjection =
      activeBaseLayer?.sourceProjection ?? dataset.mapConfig.projection;
    const tileGrid = resolveTileGrid(sourceProjection, activeBaseLayer?.tileSize);
    if (!tileGrid) return;
    const reprojectionErrorThreshold =
      sourceProjection !== dataset.mapConfig.projection ? 2 : undefined;

    baseLayer.current.setSource(
      createXyzSource(
        baseLayerUrl,
        activeBaseLayer?.attribution,
        tileGrid,
        sourceProjection,
        activeBaseLayer?.wrapX ?? false,
        reprojectionErrorThreshold,
      ),
    );
    baseLayer.current.setOpacity(activeBaseLayer?.opacity ?? 0.9);
    baseLayer.current.setVisible(true);
  }, [
    dataset,
    baseLayerUrl,
    activeBaseLayer?.opacity,
    activeBaseLayer?.attribution,
    activeBaseLayer?.sourceProjection,
    activeBaseLayer?.tileSize,
    activeBaseLayer?.wrapX,
  ]);

  useEffect(() => {
    if (!dataset || !tileGridRef.current || !coastLayer.current) return;

    const url = overlayTileUrl(dataset.overlays.coastlines, activeDate);
    if (!url) return;
    if (url === coastUrlRef.current) return;
    coastUrlRef.current = url;

    coastLayer.current.setSource(
      createXyzSource(
        url,
        dataset.overlays.coastlines.attribution,
        tileGridRef.current,
        dataset.mapConfig.projection,
      ),
    );
    coastLayer.current.setOpacity(dataset.overlays.coastlines.opacity);
  }, [dataset, activeDate]);

  useEffect(() => {
    if (!dataset || !tileGridRef.current || !graticuleLayer.current) return;

    if (!isXyzLayer(graticuleLayer.current)) return;

    const graticuleSource = dataset.overlays.graticule;
    const url = overlayTileUrl(graticuleSource, activeDate);
    if (!url) return;
    if (url === graticuleUrlRef.current) return;
    graticuleUrlRef.current = url;

    graticuleLayer.current.setSource(
      createXyzSource(
        url,
        graticuleSource.attribution,
        tileGridRef.current,
        dataset.mapConfig.projection,
      ),
    );
    graticuleLayer.current.setOpacity(graticuleSource.opacity);
  }, [dataset, activeDate]);

  useEffect(() => {
    if (coastLayer.current) {
      coastLayer.current.setZIndex(LAYER_Z_INDEX.coast);
      coastLayer.current.setVisible(showCoastlines);
    }
  }, [showCoastlines]);

  useEffect(() => {
    if (graticuleLayer.current) {
      graticuleLayer.current.setZIndex(LAYER_Z_INDEX.graticule);
      graticuleLayer.current.setVisible(showGraticule);
    }
  }, [showGraticule]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !dataset) return;

    const previousLayer = iceLayer.current;
    if (previousLayer) {
      map.removeLayer(previousLayer);
      iceLayer.current = null;
      iceLayerSourceId.current = null;
    }

    if (!iceLayerUrl || !activeIceSource) {
      setIceStatus({ state: "idle" });
      return;
    }

    setIceStatus({ state: "loading" });

    const iceOpacity = activeIceSource.opacity ?? 0.75;

    let layer: BaseLayer | null = null;
    let source: IceTileSource | null = null;
    let pendingTiles = 0;
    let hadError = false;
    let renderCompleteKey: EventsKey | EventsKey[] | null = null;
    let isFinalized = false;
    let isActivated = false;
    let cancelled = false;

    const activateLayer = () => {
      if (!layer || isActivated) return;
      isActivated = true;
      iceLayer.current = layer;
      iceLayerSourceId.current = activeIceSource.id;
    };

    const detachRenderComplete = () => {
      if (!renderCompleteKey) return;
      unByKey(renderCompleteKey);
      renderCompleteKey = null;
    };

    const finalizeLayer = () => {
      if (!layer || isFinalized || cancelled) return;
      isFinalized = true;
      detachRenderComplete();
      layer.setOpacity(iceOpacity);
      activateLayer();
    };

    const markReadyIfIdle = () => {
      if (pendingTiles === 0 && !hadError) {
        setIceStatus({ state: "ready" });
        finalizeLayer();
      }
    };

    const onTileLoadStart = () => {
      pendingTiles += 1;
      setLoadingStatus();
    };

    const onTileLoadEnd = () => {
      pendingTiles = Math.max(0, pendingTiles - 1);
      markReadyIfIdle();
    };

    const onTileLoadError = () => {
      pendingTiles = Math.max(0, pendingTiles - 1);
      hadError = true;
      detachRenderComplete();
      setIceStatus({ state: "error", message: "tile load failed" });
      if (layer && !isFinalized) {
        map.removeLayer(layer);
      }
    };

    const detachEvents = (source: IceTileSource) => {
      source.un("tileloadstart", onTileLoadStart);
      source.un("tileloadend", onTileLoadEnd);
      source.un("tileloaderror", onTileLoadError);
    };

    const addPendingLayer = (nextLayer: BaseLayer) => {
      layer = nextLayer;
      layer.setZIndex(LAYER_Z_INDEX.ice);
      map.addLayer(layer);
      activateLayer();
      renderCompleteKey = map.on("rendercomplete", markReadyIfIdle);
      map.render();
    };

    if (activeIceSource.kind === "wms") {
      const mapProjection = dataset.mapConfig.projection;
      const wmsProjection = resolveWmsProjection(activeIceSource, mapProjection);
      const params = buildWmsParams(activeIceSource, activeDate);
      const reprojectionErrorThreshold =
        wmsProjection !== dataset.mapConfig.projection ? 2 : undefined;

      const tileGrid =
        wmsProjection === dataset.mapConfig.projection && tileGridRef.current
          ? tileGridRef.current
          : createXYZ({
              tileSize: 256,
              extent: getProjection(wmsProjection)?.getExtent(),
            });

      source = new TileWMS({
        url: iceLayerUrl,
        params,
        projection: wmsProjection,
        tileGrid,
        crossOrigin: "anonymous",
        attributions: activeIceSource.attribution,
        transition: 0,
        reprojectionErrorThreshold,
      });

      layer = new TileLayer({
        source,
        opacity: 0,
        preload: 0,
        useInterimTilesOnError: true,
        className: "ice-layer",
      });
    } else if (activeIceSource.kind === "geotiff") {
      void (async () => {
        try {
          const resolvedUrl = await resolveExistingFileUrl(
            activeIceSource,
            activeDate,
            iceLayerUrl,
          );
          if (cancelled) return;
          if (!resolvedUrl) {
            setIceStatus({
              state: "error",
              message: "No raster file found for recent dates",
            });
            return;
          }

          const proxiedResolvedUrl = buildProxyUrl(resolvedUrl);
          const sourceCacheKey = `${activeIceSource.id}:${proxiedResolvedUrl}`;
          const cachedSource = geoTiffSourceCacheRef.current.get(sourceCacheKey);
          source =
            cachedSource ??
            new GeoTIFFSource({
              sources: [{ url: proxiedResolvedUrl }],
              sourceOptions: { allowFullFile: true },
              projection: activeIceSource.sourceProjection,
              wrapX: activeIceSource.wrapX ?? false,
              normalize: false,
            });
          if (!cachedSource) {
            geoTiffSourceCacheRef.current.set(sourceCacheKey, source);
          }

          layer = new WebGLTileLayer({
            source,
            opacity: 0,
            className: "ice-layer",
            style: buildGeoTiffStyle(activeIceSource.id) as any,
          });

          source.on("tileloadstart", onTileLoadStart);
          source.on("tileloadend", onTileLoadEnd);
          source.on("tileloaderror", onTileLoadError);
          addPendingLayer(layer);
        } catch (error) {
          if (cancelled) return;
          const errorMessage =
            error instanceof Error ? error.message : "raster render failed";
          setIceStatus({
            state: "error",
            message: errorMessage,
          });
          if (layer && !isFinalized) {
            map.removeLayer(layer);
          }
        }
      })();

      return () => {
        cancelled = true;
        detachRenderComplete();
        if (source) {
          detachEvents(source);
        }
        if (layer && iceLayer.current !== layer) {
          map.removeLayer(layer);
        }
      };
    } else {
      const sourceProjection = activeIceSource.sourceProjection ?? dataset.mapConfig.projection;
      const tileGrid = resolveTileGrid(sourceProjection, activeIceSource.tileSize);
      if (!tileGrid) return;
      const reprojectionErrorThreshold =
        sourceProjection !== dataset.mapConfig.projection ? 2 : undefined;

      source = createXyzSource(
        iceLayerUrl,
        activeIceSource.attribution,
        tileGrid,
        sourceProjection,
        activeIceSource.wrapX ?? false,
        reprojectionErrorThreshold,
      );

      layer = new TileLayer({
        source,
        opacity: 0,
        preload: 0,
        useInterimTilesOnError: true,
        className: "ice-layer",
      });
    }

    if (layer && source) {
      source.on("tileloadstart", onTileLoadStart);
      source.on("tileloadend", onTileLoadEnd);
      source.on("tileloaderror", onTileLoadError);

      addPendingLayer(layer);

      return () => {
        cancelled = true;
        detachRenderComplete();
        if (source) {
          detachEvents(source);
        }
        if (layer && iceLayer.current !== layer) {
          map.removeLayer(layer);
        }
      };
    }
  }, [dataset, iceLayerUrl, activeIceSource, activeDate, iceReloadToken]);

  useEffect(() => {
    if (activeIceSource?.opacity === undefined) return;
    if (iceLayer.current) {
      iceLayer.current.setOpacity(activeIceSource.opacity);
    }
  }, [activeIceSource?.opacity]);

  useEffect(() => {
    let cancelled = false;

    if (activeIceSource?.kind === "geotiff") {
      setLegendData(resolveFileLegend(activeIceSource));
      return () => {
        cancelled = true;
      };
    }

    if (!legendJsonUrl && !legendMetaUrl) {
      setLegendData(null);
      return;
    }

    const loadLegend = async () => {
      try {
        if (legendJsonUrl) {
          const cached = legendJsonCache.get(legendJsonUrl);
          const data = cached
            ? cached
            : await (async () => {
                const res = await fetch(legendJsonUrl);
                if (!res.ok) throw new Error(`Legend fetch failed: ${res.status}`);
                const payload = (await res.json()) as LegendJsonResponse;
                legendJsonCache.set(legendJsonUrl, payload);
                return payload;
              })();

          const continuous = data.continuous;
          const colors = continuous?.cmap?.colorMapStrings;
          if (!continuous || !Array.isArray(colors) || colors.length === 0) {
            if (!cancelled) setLegendData(null);
            return;
          }

          const steps = Math.min(24, colors.length);
          const stops = Array.from({ length: steps }, (_, idx) => {
            const colorIndex = Math.round((idx / (steps - 1)) * (colors.length - 1));
            const color = colors[colorIndex] ?? colors[0];
            const pct = ((idx / (steps - 1)) * 100).toFixed(2);
            return `${color} ${pct}%`;
          });
          const isIceConcLegend = activeIceSource?.id === "osiSafAmsr2Wms";
          const gradient = isIceConcLegend ? "" : `linear-gradient(90deg, ${stops.join(", ")})`;

          if (!cancelled) {
            setLegendData({
              gradient,
              min: Number(continuous.valueMin ?? 0),
              max: Number(continuous.valueMax ?? 1),
              units: continuous.units ?? undefined,
              label: continuous.variableName ?? undefined,
            });
          }
          return;
        }

        if (legendMetaUrl) {
          const cached = legendMetaCache.get(legendMetaUrl);
          const data = cached
            ? cached
            : await (async () => {
                const res = await fetch(legendMetaUrl);
                if (!res.ok) throw new Error(`Legend meta fetch failed: ${res.status}`);
                const payload = (await res.json()) as LegendMetaResponse;
                legendMetaCache.set(legendMetaUrl, payload);
                return payload;
              })();
          const [minRaw, maxRaw] = Array.isArray(data.scaleRange)
            ? data.scaleRange
            : [undefined, undefined];
          const min = minRaw !== undefined ? Number(minRaw) : 0;
          const max = maxRaw !== undefined ? Number(maxRaw) : 1;
          if (!cancelled) {
            setLegendData({
              gradient: "",
              min,
              max,
              units: data.units ?? undefined,
            });
          }
        }
      } catch {
        if (!cancelled) setLegendData(null);
      }
    };

    void loadLegend();
    return () => {
      cancelled = true;
    };
  }, [activeIceSource, legendJsonUrl, legendMetaUrl]);

  useEffect(() => {
    setLegendImageOrientation(null);
  }, [legendUrl]);

  const handleLegendImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setLegendImageOrientation(naturalHeight > naturalWidth ? "vertical" : "horizontal");
  };

  return (
    <Card className="relative min-h-[655px] overflow-hidden border-slate-700">
      <div
        ref={mapRef}
        className="h-[655px] w-full bg-slate-900"
        aria-label="Arctic sea ice map"
      />

      <div className="absolute bottom-3 right-3 z-[10] pointer-events-none rounded-md bg-slate-900/80 px-2 py-1 text-[11px] text-slate-200">
        {t("latitudeLabel")}: {cursorCoords ? cursorCoords.lat.toFixed(3) : "--"} /{" "}
        {t("longitudeLabel")}: {cursorCoords ? cursorCoords.lon.toFixed(3) : "--"}
      </div>
      {legendUrl || legendData ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[10] rounded-sm border border-slate-700/70 bg-slate-900/85 px-4 py-2 text-[10px] text-slate-200 shadow-md">
          <div className="flex items-center justify-between gap-3 text-[10px] text-slate-300">
            <span className="uppercase text-slate-400">{t("legendLabel")}</span>
            {legendData?.units ? <span>{legendData.units}</span> : null}
          </div>
          {legendData ? (
            <div className="mt-1 w-[320px]">
              {legendData.gradient ? (
                <div className="h-4 w-full rounded-md border border-slate-700/70 bg-slate-950/40 p-[2px]">
                  <div
                    className="h-full w-full rounded-sm"
                    style={{ background: legendData.gradient }}
                  />
                </div>
              ) : (
                <div className="h-4 w-full rounded-md border border-slate-700/70 bg-slate-950/40 p-[2px]">
                  <div className="relative h-full w-full overflow-hidden rounded-full">
                    <img
                      src={legendUrl}
                      alt={`${activeIceSource?.label ?? "legend"}`}
                      className={
                        legendOrientation === "vertical"
                          ? "absolute left-1/2 top-1/2 h-[320px] w-[32px] -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover"
                          : "h-full w-full object-cover"
                      }
                      onLoad={handleLegendImageLoad}
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>{legendData.min.toFixed(2)}</span>
                <span>{legendData.max.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="mt-1 w-[320px]">
              <div className="h-4 w-full rounded-full border border-slate-700/70 bg-slate-950/40 p-[2px]">
                <div className="relative h-full w-full overflow-hidden rounded-full">
                  <img
                  src={legendUrl}
                  alt={`${activeIceSource?.label ?? "legend"}`}
                  className={
                    legendOrientation === "vertical"
                      ? "absolute left-1/2 top-1/2 h-[320px] w-[32px] -translate-x-1/2 -translate-y-1/2 rotate-90 object-cover"
                      : "h-full w-full object-cover"
                  }
                    onLoad={handleLegendImageLoad}
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="absolute left-4 top-4 z-[1000] rounded-md bg-slate-900/80 px-3 py-2 text-[11px] text-slate-300">
        <div>
          {t("baseMap")}:{" "}
          {activeBaseLayer ? activeBaseLayer.label : <span>{t("notSelected")}</span>}
        </div>
        <div>
          {t("iceConcentration")}:{" "}
          {activeIceSource ? activeIceSource.label : <span>{t("notSelected")}</span>}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span>
            {t("dataStatus")}:{" "}
            <span
              className={
                iceStatus.state === "error"
                  ? "text-rose-300"
                  : iceStatus.state === "ready"
                    ? "text-emerald-300"
                    : iceStatus.state === "loading"
                      ? "text-amber-300"
                      : "text-slate-400"
              }
            >
              {iceStatus.state === "loading"
                ? t("loading")
                : iceStatus.state === "ready"
                  ? t("ready")
                  : iceStatus.state === "error"
                    ? t("error")
                    : t("notSelected")}
            </span>
          </span>
          {iceStatus.state === "error" ? (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
            >
              {t("retry")}
            </button>
          ) : null}
        </div>
        {iceStatus.state === "error" && iceStatus.message ? (
          <div className="mt-1 max-w-[320px] text-[10px] text-rose-200">
            {iceStatus.message}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
