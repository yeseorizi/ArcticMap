export type TileLayerSource = {
  id: string;
  label: string;
  layer: string;
  tileMatrixSet: string;
  description: string;
  format: "jpg" | "jpeg" | "png" | "tif";
  attribution: string;
  infoUrl?: string;
  urlTemplate: string;
  opacity: number;
  kind?: "wmts" | "geotiff" | "wms";
  bounds?: [[number, number], [number, number]];
  wmsCrs?: string[];
  wmsTime?: boolean;
  wmsStyles?: string[];
  wmsDefaultStyle?: string;
  wmsVersion?: "1.1.1" | "1.3.0";
  wmsPalette?: string;
  wmsColorScaleRange?: string;
  wmsNumColorBands?: number;
  wmsLogScale?: boolean;
  wmsCatalogRoot?: string;
  wmtsStyle?: string;
  legendUrlTemplate?: string;
  legendJsonUrlTemplate?: string;
  legendOrientation?: "horizontal" | "vertical";
  wmtsCapabilitiesUrl?: string;
  sourceProjection?: string;
  tileSize?: number;
  wrapX?: boolean;
  skipDateAvailabilityCheck?: boolean;
  assumeDailyDatesFrom?: string;
  assumeDailyDatesTo?: string;
  availabilityLagDays?: number;
  fileDateLookbackDays?: number;
  fallbackUrlTemplates?: string[];
};

export type GraticuleSource = {
  id: string;
  label: string;
  kind: "graticule";
  attribution: string;
  description: string;
  opacity: number;
  minLat: number;
  maxLat: number;
  latStep: number;
  lonStep: number;
  segmentStep: number;
  labelEveryLat?: number;
  labelEveryLon?: number;
  labelLon?: number;
  labelLat?: number;
  poleGap?: number;
  zoomSteps?: GraticuleZoomStep[];
  color?: string;
  weight?: number;
  dashArray?: string;
};

export type GraticuleZoomStep = {
  minZoom: number;
  maxZoom?: number;
  latStep: number;
  lonStep: number;
  segmentStep?: number;
  labelEveryLat?: number;
  labelEveryLon?: number;
  dashArray?: string;
  opacity?: number;
  weight?: number;
  poleGap?: number;
};

export type OverlaySource = TileLayerSource | GraticuleSource;

export const isGraticuleSource = (
  source: OverlaySource | undefined,
): source is GraticuleSource => !!source && source.kind === "graticule";

export const isTileLayerSource = (
  source: OverlaySource | undefined,
): source is TileLayerSource => !!source && "urlTemplate" in source;

export type Snapshot = {
  label: string;
  date: string;
  extent: number;
  anomaly: number;
  drift: string;
  concentration: number;
};

export type DatasetResponse = {
  mapConfig: {
    projection: string;
    proj4: string;
    resolutions: number[];
    origin: [number, number];
    bounds: [[number, number], [number, number]];
    viewBounds?: [[number, number], [number, number]];
    center: [number, number];
    initialZoom: number;
    minZoom: number;
    maxZoom: number;
    maxBounds: [[number, number], [number, number]];
  };
  baseLayers: Record<string, TileLayerSource>;
  iceSources: Record<string, TileLayerSource>;
  overlays: Record<string, OverlaySource>;
  snapshots: Snapshot[];
  calendarDays: Array<number | null>;
  defaults: {
    baseLayerKey: string;
    iceSourceKey: string;
    showCoastlines: boolean;
    showGraticule: boolean;
    defaultDate: string;
  };
};

const gibsUrlTemplate =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3413/best/{layer}/default/{time}/{tileMatrixSet}/{z}/{y}/{x}.{format}";
const gibsStaticUrlTemplate =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3413/best/{layer}/default/{tileMatrixSet}/{z}/{y}/{x}.{format}";
const gibsWms4326Template =
  "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const gibsStaticWmts4326Template =
  "https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/{layer}/default/{tileMatrixSet}/{z}/{y}/{x}.{format}";
const gibsStaticWmts3857Template =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/{layer}/default/{tileMatrixSet}/{z}/{y}/{x}.{format}";
const eoxWmsTemplate = "https://tiles.maps.eox.at/wms";
const osmUrlTemplate = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const cartoDarkUrlTemplate =
  "https://abcd.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png";
const cartoLightUrlTemplate =
  "https://abcd.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png";
const cartoVoyagerUrlTemplate =
  "https://abcd.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png";
const stadiaAlidadeSmoothDarkUrlTemplate =
  "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png";
const esriWorldImageryUrlTemplate =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const usgsImageryTopoUrlTemplate =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer/tile/{z}/{y}/{x}";
const noaaGeoTiffTemplate =
  "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/geotiff/{year}/{month}_{monthName}/N_{ymd}_concentration_v4.0.tif";
const bremenAsiAmsr2GeoTiffTemplate =
  "https://data.seaice.uni-bremen.de/amsr2/asi_daygrid_swath/n3125/{year}/{monthShortLower}/Arctic3125/asi-AMSR2-n3125-{ymd}-v5.4.tif";
const bremenSmosGeoTiffTemplate =
  "https://data.seaice.uni-bremen.de/smos/tif/{ymd}_hvnorth__l1c.tif";
const osiSafWmsFileTemplate =
  "https://thredds.met.no/thredds/wms/osisaf/met.no/ice/amsr2_conc/{YYYY}/{MM}/ice_conc_nh_polstere-100_amsr2_{YYYYMMDD}1200.nc";
const copernicusWmtsTemplate =
  "https://wmts.marine.copernicus.eu/teroWmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER={layer}&STYLE={style}&TILEMATRIXSET={tileMatrixSet}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/{format}&TIME={time}T12:00:00.000Z";
const copernicusWmtsLegendTemplate =
  "https://wmts.marine.copernicus.eu/teroWmts?SERVICE=WMTS&REQUEST=GetLegend&LAYER={layer}&STYLE={style}&FORMAT=image%2Fsvg%2Bxml";
const copernicusWmtsLegendJsonTemplate =
  "https://wmts.marine.copernicus.eu/teroWmts?SERVICE=WMTS&REQUEST=GetLegend&LAYER={layer}&STYLE={style}&FORMAT=application/json";
const copernicusNextSimWmtsCapabilitiesUrl =
  "https://wmts.marine.copernicus.eu/teroWmts/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311?request=GetCapabilities&service=WMTS";
const copernicusGlobalSeaIceWmtsCapabilitiesUrl =
  "https://wmts.marine.copernicus.eu/teroWmts?request=GetCapabilities&service=WMTS";

const pad2 = (value: number) => String(value).padStart(2, "0");

const toLocalDateKey = (value: Date) =>
  `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;

const buildDayBeforeYesterdaySnapshot = (): Snapshot => {
  const dayBeforeYesterday = new Date();
  dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
  const date = toLocalDateKey(dayBeforeYesterday);
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  }).format(dayBeforeYesterday);

  return {
    label,
    date,
    extent: 0,
    anomaly: 0,
    drift: "N/A",
    concentration: 0,
  };
};

const dayBeforeYesterdaySnapshot = buildDayBeforeYesterdaySnapshot();

export const dataset: DatasetResponse = {
  mapConfig: {
    projection: "EPSG:3413",
    proj4:
      "+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs",
    resolutions: [8192, 4096, 2048, 1024, 512, 256, 128, 64],
    origin: [-4194304, 4194304],
    bounds: [
      [-4194304, -4194304],
      [4194304, 4194304],
    ],
    viewBounds: [
      [-7500000, -7500000],
      [8500000, 8500000],
    ],
    center: [90, 0],
    initialZoom: 0,
    minZoom: 0,
    maxZoom: 7,
    maxBounds: [
      [50, -180],
      [90, 180],
    ],
  },
  baseLayers: {
    cartoDark: {
      id: "cartoDark",
      label: "Dark Map (CartoDB DarkMatter)",
      description: "Carto DB DarkMatter dark color map",
      layer: "voyager",
      infoUrl: "https://carto.com/attributions",
      tileMatrixSet: "xyz",
      format: "png",
      attribution: "OpenStreetMap contributors / CartoDB",
      urlTemplate: cartoDarkUrlTemplate,
      opacity: 1,
      sourceProjection: "EPSG:3857",
      tileSize: 256,
      wrapX: true,
    },
    cartoLight: {
      id: "cartoLight",
      label: "Light Map (CartoDB Positron)",
      description: "Carto DB Positron light color map",
      layer: "voyager",
      infoUrl: "https://carto.com/attributions",
      tileMatrixSet: "xyz",
      format: "png",
      attribution: "OpenStreetMap contributors / CartoDB",
      urlTemplate: cartoLightUrlTemplate,
      opacity: 1,
      sourceProjection: "EPSG:3857",
      tileSize: 256,
      wrapX: true,
    },
    cartoVoyager: {
      id: "cartoVoyager",
      label: "Colorful Map (CartoDB Voyager)",
      description: "CARTO Voyager raster basemap",
      layer: "voyager",
      infoUrl: "https://carto.com/attributions",
      tileMatrixSet: "xyz",
      format: "png",
      attribution: "OpenStreetMap contributors / CartoDB",
      urlTemplate: cartoVoyagerUrlTemplate,
      opacity: 1,
      sourceProjection: "EPSG:3857",
      tileSize: 256,
      wrapX: true,
    },
    openStreetMap: {
      id: "openStreetMap",
      label: "Colorful Map (OpenStreetMap Mapnik)",
      description: "OpenStreetMap standard basemap",
      layer: "osm",
      infoUrl: "https://www.openstreetmap.org/copyright",
      tileMatrixSet: "xyz",
      format: "png",
      attribution: "OpenStreetMap contributors",
      urlTemplate: osmUrlTemplate,
      opacity: 1,
      sourceProjection: "EPSG:3857",
      tileSize: 256,
      wrapX: true,
    },
    usgsImageryTopo: {
      id: "usgsImageryTopo",
      label: "Topo Satellite (USGS Imagery Topo)",
      description: "USGS The National Map Imagery Topo basemap",
      layer: "USGSImageryTopo",
      infoUrl:
        "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryTopo/MapServer",
      tileMatrixSet: "xyz",
      format: "jpg",
      attribution: "USGS The National Map",
      urlTemplate: usgsImageryTopoUrlTemplate,
      opacity: 1,
      sourceProjection: "EPSG:3857",
      tileSize: 256,
      wrapX: false,
    },
    esriWorldImagery: {
      id: "esriWorldImagery",
      label: "Satellite Map (Esri World Imagery)",
      description: "Esri World Imagery satellite basemap",
      layer: "World_Imagery",
      infoUrl:
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
      tileMatrixSet: "xyz",
      format: "jpg",
      attribution: "Esri World Imagery",
      urlTemplate: esriWorldImageryUrlTemplate,
      opacity: 1,
      sourceProjection: "EPSG:3857",
      tileSize: 256,
      wrapX: true,
    },
    blueMarble: {
      id: "blueMarble",
      label: "Satellite Map (NASA Blue Marble)",
      description: "The MODIS Blue Marble, Next Generation is a static product created with data from 2004 from the MODIS instrument on board the Terra satellite. The image resolution is 500 m. It can be viewed in Worldview/Global Imagery Browse Services (GIBS)",
      layer: "BlueMarble_NextGeneration",
      infoUrl:
        "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation",
      tileMatrixSet: "500m",
      format: "jpeg",
      attribution: "NASA GIBS",
      urlTemplate: gibsStaticUrlTemplate,
      opacity: 0.9,
    },
    blueMarbleBathymetry: {
      id: "blueMarbleBathymetry",
      description: "Blue Marble with shaded relief and bathymetry",
      label: "Satellite Map (NASA Blue Marble Bathymetry)",
      layer: "BlueMarble_ShadedRelief_Bathymetry",
      infoUrl:
        "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation",
      tileMatrixSet: "500m",
      format: "jpeg",
      attribution: "NASA GIBS",
      urlTemplate: gibsStaticUrlTemplate,
      opacity: 0.9,
    },
    // modis: {
    //   id: "modis",
    //   description:"modis",
    //   label: "MODIS Terra True Color",
    //   layer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    //   tileMatrixSet: "250m",
    //   format: "jpg",
    //   attribution: "NASA GIBS",
    //   urlTemplate: gibsUrlTemplate,
    //   opacity: 0.95
    // }
  },
  iceSources: {
    ASMR2OsiSafIceConc: {
      id: "ASMR2OsiSafIceConc",
      label: "Sea Ice Concentration, OSI SAF GLOBAL (10km)",
      description:
        "For the Global - Arctic and Antarctic - Ocean. The OSI SAF delivers five global sea ice products in operational mode: sea ice concentration, sea ice edge, sea ice type (OSI-401, OSI-402, OSI-403, OSI-405 and OSI-408). The sea ice concentration, edge and type products are delivered daily at 10km resolution and the sea ice drift in 62.5km resolution, all in polar stereographic projections covering the Northern Hemisphere and the Southern Hemisphere. The sea ice drift motion vectors have a time-span of 2 days. These are the Sea Ice operational nominal products for the Global Ocean.",
      layer:
        "SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001/osisaf_obs-si_glo_phy-sic-north_nrt_amsr2_l4_P1D-m_202304/ice_conc",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service / EUMETSAT OSI SAF",
      infoUrl:
        "https://data.marine.copernicus.eu/product/SEAICE_GLO_SEAICE_L4_NRT_OBSERVATIONS_011_001",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:viridis",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      legendOrientation: "vertical",
      wmtsCapabilitiesUrl: copernicusGlobalSeaIceWmtsCapabilitiesUrl,
      availabilityLagDays: 1,
      sourceProjection: "EPSG:4326",
      wrapX: true,
      bounds: [
        [-180, 30],
        [179.9, 90],
      ],
    },
    osiSafAmsr2Wms: {
      id: "osiSafAmsr2Wms",
      label: "Sea Ice Concentration, OSI SAF OSI-408-a (10 km) (Slow)",
      description: "The AMSR-2 sea ice concentration product (OSI-408-a) is complementary to the SSMIS global sea ice concentration product (OSI-401-d).The product utilises the AMSR-2 satellite microwave radiometer data.",
      layer: "ice_conc",
      tileMatrixSet: "wms",
      format: "png",
      attribution: "EUMETSAT OSI SAF",
      infoUrl: "https://osisaf-hl.met.no/osi-408-a-desc",
      urlTemplate: osiSafWmsFileTemplate,
      opacity: 0.75,
      kind: "wms",
      wmsTime: false,
      wmsCrs: ["EPSG:3857", "CRS:84", "EPSG:4326"],
      wmsDefaultStyle: "boxfill",
      wmsPalette: "viridis",
      wmsColorScaleRange: "0,100",
      legendOrientation: "vertical",
      wmsCatalogRoot:
        "https://thredds.met.no/thredds/catalog/osisaf/met.no/ice/amsr2_conc",
    },
    arcSicNrtViridis: {
      id: "arcSicNrtViridis",
      label: "Sea Ice Concentration, OSI SAF High-Res L4 (1 km)",
      description:
        "Arctic L4 sea ice concentration product based on a L3 sea ice concentration product retrieved from Sentinel-1 and RCM SAR imagery and GCOM-W AMSR2 microwave radiometer data using a deep learning algorithm (SEAICE_ARC_PHY_AUTO_L3_MYNRT_011_023), gap-filled with OSI SAF EUMETSAT sea ice concentration products and delivered on a 1 km grid.",
      layer:
        "SEAICE_ARC_PHY_AUTO_L4_MYNRT_011_024/cmems_obs-si_arc_phy_nrt_l4_P1D_202411/sic",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service",
      infoUrl:
        "https://data.marine.copernicus.eu/product/SEAICE_ARC_PHY_AUTO_L4_MYNRT_011_024",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:viridis",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      legendOrientation: "vertical",
      wmtsCapabilitiesUrl: copernicusGlobalSeaIceWmtsCapabilitiesUrl,
      availabilityLagDays: 2,
      sourceProjection: "EPSG:4326",
      wrapX: true,
      bounds: [
        [-179.995, 31.005],
        [179.995, 89.995],
      ],
    },
    noaaNsidcSeaIceIndex25km: {
      id: "noaaNsidcSeaIceIndex25km",
      label: "Sea Ice Concentration, NOAA@NSIDC, Sea Ice Index (25 km)",
      description:
        "The AMSR2 Daily Polar Gridded Sea Ice Concentrations data set provides sea ice concentrations for both the Northern and Southern Hemispheres. The Advanced Microwave Scanning Radiometer 2 (AMSR2) sensor on the Japan Aerospace Exploration Agency (JAXA) Global Change Observation Mission - Water (GCOM-W) satellite provides the daily passive microwave brightness temperature [TB] data via AMSR2 Daily Polar Gridded Brightness Temperatures (NSIDC-0802) which is used as input for this product. As this product is intended to provide a follow-on data set for Near-Real-Time DMSP SSMIS Daily Polar Gridded Sea Ice Concentrations (NSIDC-0081) and Sea Ice Concentrations from Nimbus-7 SMMR and DMSP SSM/I-SSMIS Passive Microwave Data (NSIDC-0051), it uses TB fields gridded to match TBs gridded from SSMIS sensors on the same 25km polar stereo grids. For Sea Ice Concentrations prior to 1 January 2025 are from Nimbus-7 SMMR and DMSP SSM/I-SSMIS Passive Microwave Data",
      layer: "N_{ymd}_concentration_v4.0",
      tileMatrixSet: "raster-file",
      format: "tif",
      attribution: "AMSR2 Daily Polar Gridded, Version 2",
      infoUrl: "https://nsidc.org/data/nsidc-0803/versions/2",
      urlTemplate: noaaGeoTiffTemplate,
      opacity: 0.8,
      kind: "geotiff",
      sourceProjection: "EPSG:3413",
      skipDateAvailabilityCheck: true,
      assumeDailyDatesFrom: "2012-07-02",
      fileDateLookbackDays: 120,
    },
    bremenAsiAmsr2Sic: {
      id: "bremenAsiAmsr2Sic",
      label: "Sea Ice Concentration, Univ. Bremen, ASI-AMSR2 (3.125 km)",
      description:
        "sea ice concentration data are retrieved with the ARTIST Sea Ice (ASI) algorithm (Spreen et al., 2008) which is applied to microwave radiometer data of the sensors AMSR-E (Advanced Microwave Scanning Radiometer for EOS) on the NASA satellite Aqua, and AMSR2 (Advanced Microwave Scanning Radiometer 2) on the JAXA satellite GCOM-W1.",
      layer: "asi-AMSR2-n3125",
      tileMatrixSet: "raster-file",
      format: "tif",
      attribution: "Univ. Bremen ASI-AMSR2 n3125",
      infoUrl:
        "https://seaice.uni-bremen.de/sea-ice-concentration/amsre-amsr2/information/",
      urlTemplate: bremenAsiAmsr2GeoTiffTemplate,
      opacity: 0.8,
      kind: "geotiff",
      sourceProjection: "EPSG:3413",
      skipDateAvailabilityCheck: true,
      assumeDailyDatesFrom: "2012-07-02",
      fileDateLookbackDays: 90,
    },
    bremenSmosSmapThinIceThickness: {
      id: "bremenSmosSmapThinIceThickness",
      label: "Sea Ice Thickness, Univ. Bremen, SMOS (40 km)",
      description:
        "The thickness of thin sea ice (SIT) is daily retrieved from observations of the L-band microwave sensor SMOS (Soil Moisture and Ocean Salinity). Horizontal and vertical polarized brightness temperatures in the incidence angle range of 40° to 50° are averaged. The ice thickness is then inferred from the polarization difference and the intensity using an empirical method (Huntemann et al., 2014). Thin sea ice occurs during the freezing season. In the melting season, the thickness of sea ice is highly variable and the emission properties in the microwave change due to the wetness of the surface and occurrence of melt ponds in the Arctic. Therefore, thickness data are calculated only during the freezing season, that is from October to April in the Arctic and from March to September in the Antarctic. During the melting season, the procedure does not yield meaningful results. Two variants of the data SMOS sea ice thickness data are processed, an RFI filtered version and a raw unfiltered version. Despite L-band emission at the SMOS&SMAP frequency being banned for communication, strong emissions from various sources on the ground may affect the sensitive instruments and cause large errors in the ice thickness data. We use the RFI related flags in the SMOS L1C and SMAP L1b data to filter out affected data. It is, in general, advisable to use the filtered version of the SMOS product or the SMOS&SMAP combined product, where this data is filtered by default. As the resolution of SMOS at the used incidence angle range is about 40 km, only larger regions of thin ice will be retrieved correctly. The rim of thin ice shown in many cases not necessarily indicates thin ice, but can also be caused by the smearing effect (convolution) of the low resolution. Each day of ice thickness data product are calculated twice to ensure that all swath files were available in the archived product. First processing is done directly on the next day with only about 7 hours delay. At this time it can happen that not all swath files are available and another processing of the same day is initiated 23 hours later. In more than 50% of the time the first processing does not include all swath but usually provides sufficient coverage for Arctic and Antarctic regions. This service has been developed in the framework of the EU project SIDARUS. After completion of the SIDARUS project end 2013, the service is continued on a best effort base in the context of the Polar View and of the Arctic Regional Ocean Observing System (Arctic ROOS).",
      layer: "hvnorth__l1c",
      tileMatrixSet: "raster-file",
      format: "tif",
      attribution: "Univ. Bremen SMOS Think Ice Dataset",
      infoUrl: "https://seaice.uni-bremen.de/thin-ice-thickness/",
      urlTemplate: bremenSmosGeoTiffTemplate,
      opacity: 0.8,
      kind: "geotiff",
      sourceProjection: "EPSG:3413",
      skipDateAvailabilityCheck: true,
      assumeDailyDatesFrom: "2010-10-01",
      fileDateLookbackDays: 120,
    },
    // osiSafAmsr2WmsUncertainty: {
    //   id: "osiSafAmsr2WmsUncertainty",
    //   label: "OSI SAF AMSR2 SIC (WMS · total_uncertainty)",
    //   layer: "total_uncertainty",
    //   tileMatrixSet: "wms",
    //   format: "png",
    //   attribution: "EUMETSAT OSI SAF",
    //   infoUrl: "https://osi-saf.eumetsat.int/products/sea-ice-products",
    //   urlTemplate: osiSafWmsFileTemplate,
    //   opacity: 0.75,
    //   kind: "wms",
    //   wmsTime: false,
    //   wmsCrs: ["EPSG:3857", "CRS:84", "EPSG:4326"],
    //   wmsDefaultStyle: "boxfill",
    //   wmsColorScaleRange: "-50,50",
    //   legendOrientation: "vertical",
    //   wmsCatalogRoot:
    //     "https://thredds.met.no/thredds/catalog/osisaf/met.no/ice/amsr2_conc",
    // },
    nextSimSeaIceConcentration: {
      id: "nextSimSeaIceConcentration",
      label: "Sea Ice Concentration & Forecast, neXtSIM (3 km, Linear)",
      description:
        "The Arctic Sea Ice Analysis and Forecast system uses the neXtSIM stand-alone sea ice model running the Brittle-Bingham-Maxwell sea ice rheology on an adaptive triangular mesh of 10 km average cell length. The model domain covers the whole Arctic domain, including the Canadian Archipelago and the Bering Sea. neXtSIM is forced with surface atmosphere forcings from the ECMWF (European Centre for Medium-Range Weather Forecasts) and ocean forcings from TOPAZ5, the ARC MFC PHY NRT system (002_001a). neXtSIM runs daily, assimilating manual ice charts, sea ice thickness from CS2SMOS in winter and providing 9-day forecasts. The output variables are the ice concentrations, ice thickness, ice drift velocity, snow depths, sea ice type, sea ice age, ridge volume fraction and albedo, provided at hourly frequency. The adaptive Lagrangian mesh is interpolated for convenience on a 3 km resolution regular grid in a Polar Stereographic projection. The projection is identical to other ARC MFC products.",
      layer:
        "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/siconc",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service / NERSC (Norway)",
      infoUrl:
        "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:viridis",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceConcentrationLog: {
      id: "nextSimSeaIceConcentrationLog",
      label: "Sea Ice Concentration & Forecast, neXtSIM (3 km, Log)",
      description:
        "The Arctic Sea Ice Analysis and Forecast system uses the neXtSIM stand-alone sea ice model running the Brittle-Bingham-Maxwell sea ice rheology on an adaptive triangular mesh of 10 km average cell length. The model domain covers the whole Arctic domain, including the Canadian Archipelago and the Bering Sea. neXtSIM is forced with surface atmosphere forcings from the ECMWF (European Centre for Medium-Range Weather Forecasts) and ocean forcings from TOPAZ5, the ARC MFC PHY NRT system (002_001a). neXtSIM runs daily, assimilating manual ice charts, sea ice thickness from CS2SMOS in winter and providing 9-day forecasts. The output variables are the ice concentrations, ice thickness, ice drift velocity, snow depths, sea ice type, sea ice age, ridge volume fraction and albedo, provided at hourly frequency. The adaptive Lagrangian mesh is interpolated for convenience on a 3 km resolution regular grid in a Polar Stereographic projection. The projection is identical to other ARC MFC products.",
      layer:
        "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/siconc",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service / NERSC (Norway)",
      infoUrl:
        "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:viridis,logScale",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceThickness: {
      id: "nextSimSeaIceThickness",
      label: "Sea Ice Thickness & Forecast, neXtSIM (3 km, Linear)",
      description:
        "The Arctic Sea Ice Analysis and Forecast system uses the neXtSIM stand-alone sea ice model running the Brittle-Bingham-Maxwell sea ice rheology on an adaptive triangular mesh of 10 km average cell length. The model domain covers the whole Arctic domain, including the Canadian Archipelago and the Bering Sea. neXtSIM is forced with surface atmosphere forcings from the ECMWF (European Centre for Medium-Range Weather Forecasts) and ocean forcings from TOPAZ5, the ARC MFC PHY NRT system (002_001a). neXtSIM runs daily, assimilating manual ice charts, sea ice thickness from CS2SMOS in winter and providing 9-day forecasts. The output variables are the ice concentrations, ice thickness, ice drift velocity, snow depths, sea ice type, sea ice age, ridge volume fraction and albedo, provided at hourly frequency. The adaptive Lagrangian mesh is interpolated for convenience on a 3 km resolution regular grid in a Polar Stereographic projection. The projection is identical to other ARC MFC products.",
      layer:
        "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/sithick",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service / NERSC (Norway)",
      infoUrl:
        "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:viridis",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceThicknessLog: {
      id: "nextSimSeaIceThicknessLog",
      label: "Sea Ice Thickness & Forecast, neXtSIM (3 km, Log)",
      description:
        "The Arctic Sea Ice Analysis and Forecast system uses the neXtSIM stand-alone sea ice model running the Brittle-Bingham-Maxwell sea ice rheology on an adaptive triangular mesh of 10 km average cell length. The model domain covers the whole Arctic domain, including the Canadian Archipelago and the Bering Sea. neXtSIM is forced with surface atmosphere forcings from the ECMWF (European Centre for Medium-Range Weather Forecasts) and ocean forcings from TOPAZ5, the ARC MFC PHY NRT system (002_001a). neXtSIM runs daily, assimilating manual ice charts, sea ice thickness from CS2SMOS in winter and providing 9-day forecasts. The output variables are the ice concentrations, ice thickness, ice drift velocity, snow depths, sea ice type, sea ice age, ridge volume fraction and albedo, provided at hourly frequency. The adaptive Lagrangian mesh is interpolated for convenience on a 3 km resolution regular grid in a Polar Stereographic projection. The projection is identical to other ARC MFC products.",
      layer:
        "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/sithick",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service / NERSC (Norway)",
      infoUrl:
        "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:viridis,logScale",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceVelocity: {
      id: "nextSimSeaIceVelocity",
      label: "Sea Ice Velocity & Forcast, neXtSIM (3 km, Linear)",
      description:
        "The Arctic Sea Ice Analysis and Forecast system uses the neXtSIM stand-alone sea ice model running the Brittle-Bingham-Maxwell sea ice rheology on an adaptive triangular mesh of 10 km average cell length. The model domain covers the whole Arctic domain, including the Canadian Archipelago and the Bering Sea. neXtSIM is forced with surface atmosphere forcings from the ECMWF (European Centre for Medium-Range Weather Forecasts) and ocean forcings from TOPAZ5, the ARC MFC PHY NRT system (002_001a). neXtSIM runs daily, assimilating manual ice charts, sea ice thickness from CS2SMOS in winter and providing 9-day forecasts. The output variables are the ice concentrations, ice thickness, ice drift velocity, snow depths, sea ice type, sea ice age, ridge volume fraction and albedo, provided at hourly frequency. The adaptive Lagrangian mesh is interpolated for convenience on a 3 km resolution regular grid in a Polar Stereographic projection. The projection is identical to other ARC MFC products.",
      layer:
        "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/sea_ice_velocity",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service / NERSC (Norway)",
      infoUrl: "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:speed,vectorStyle:solidAndVector",
      // legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      legendOrientation: "vertical",
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceVelocityLog: {
      id: "nextSimSeaIceVelocityLog",
      label: "Sea Ice Velocity & Forcast, neXtSIM (3 km, Log)",
      description:
        "The Arctic Sea Ice Analysis and Forecast system uses the neXtSIM stand-alone sea ice model running the Brittle-Bingham-Maxwell sea ice rheology on an adaptive triangular mesh of 10 km average cell length. The model domain covers the whole Arctic domain, including the Canadian Archipelago and the Bering Sea. neXtSIM is forced with surface atmosphere forcings from the ECMWF (European Centre for Medium-Range Weather Forecasts) and ocean forcings from TOPAZ5, the ARC MFC PHY NRT system (002_001a). neXtSIM runs daily, assimilating manual ice charts, sea ice thickness from CS2SMOS in winter and providing 9-day forecasts. The output variables are the ice concentrations, ice thickness, ice drift velocity, snow depths, sea ice type, sea ice age, ridge volume fraction and albedo, provided at hourly frequency. The adaptive Lagrangian mesh is interpolated for convenience on a 3 km resolution regular grid in a Polar Stereographic projection. The projection is identical to other ARC MFC products.",
      layer:
        "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/sea_ice_velocity",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service / NERSC (Norway)",
      infoUrl: "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:speed,logScale,vectorStyle:solidAndVector",
      // legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      legendOrientation: "vertical",
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    // copernicusSeaIceVelocityEast: {
    //   id: "copernicusSeaIceVelocityEast",
    //   label: "Copernicus Sea Ice Velocity (WMTS · vxsi)",
    //   layer:
    //     "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/vxsi",
    //   tileMatrixSet: "EPSG:4326",
    //   format: "png",
    //   attribution: "Copernicus Marine Service",
    //   infoUrl: "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
    //   urlTemplate: copernicusWmtsTemplate,
    //   opacity: 0.8,
    //   kind: "wmts",
    //   wmtsStyle: "cmap:delta",
    //   legendUrlTemplate: copernicusWmtsLegendTemplate,
    //   legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
    //   wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
    //   sourceProjection: "EPSG:4326",
    //   wrapX: true,
    // },
    // copernicusSeaIceVelocityNorth: {
    //   id: "copernicusSeaIceVelocityNorth",
    //   label: "Copernicus Sea Ice Velocity (WMTS · vysi)",
    //   layer:
    //     "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/vysi",
    //   tileMatrixSet: "EPSG:4326",
    //   format: "png",
    //   attribution: "Copernicus Marine Service",
    //   infoUrl: "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
    //   urlTemplate: copernicusWmtsTemplate,
    //   opacity: 0.8,
    //   kind: "wmts",
    //   wmtsStyle: "cmap:delta",
    //   legendUrlTemplate: copernicusWmtsLegendTemplate,
    //   legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
    //   wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
    //   sourceProjection: "EPSG:4326",
    //   wrapX: true,
    // },
  },
  overlays: {
    coastlines: {
      id: "coastlines_gibs_global",
      label: "Coastlines (NASA GIBS Global)",
      description: "Global coastlines from NASA GIBS (WMTS, EPSG:3857)",
      layer: "Coastlines",
      tileMatrixSet: "GoogleMapsCompatible_Level9",
      format: "png",
      attribution: "NASA GIBS",
      urlTemplate: gibsStaticWmts3857Template,
      opacity: 0.9,
      kind: "wmts",
      sourceProjection: "EPSG:3857",
      tileSize: 256,
      wrapX: true,
    },
    graticule_nasa: {
      id: "graticule_nasa",
      description: "Graticule from NASA GIBS",
      label: "Graticule (NASA GIBS)",
      layer: "Graticule (NASA GIBS)",
      tileMatrixSet: "250m",
      format: "png",
      attribution: "NASA GIBS",
      urlTemplate: gibsStaticUrlTemplate,
      opacity: 0.45,
    },
    graticule: {
      id: "graticule",
      label: "Graticule (Local)",
      description: "Graticule generated locally in the browser, with dynamic styling based on zoom level",
      kind: "graticule",
      attribution: "Generated locally",
      opacity: 0.3,
      minLat: 30,
      maxLat: 90,
      latStep: 10,
      lonStep: 30,
      segmentStep: 1,
      labelEveryLat: 10,
      labelEveryLon: 30,
      poleGap: 0.08,
      color: "#ffffff",
      weight: 1,
      zoomSteps: [
        {
          minZoom: 5,
          latStep: 2,
          lonStep: 15,
          segmentStep: 1,
          labelEveryLat: 2,
          labelEveryLon: 15,
          poleGap: 0.002,
          // dashArray: "2,4"
        },
        {
          minZoom: 4,
          latStep: 2,
          lonStep: 15,
          segmentStep: 1,
          labelEveryLat: 2,
          labelEveryLon: 15,
          poleGap: 0.005,
          // dashArray: "2,4"
        },
        {
          minZoom: 3,
          latStep: 2.5,
          lonStep: 20,
          segmentStep: 1,
          labelEveryLat: 2.5,
          labelEveryLon: 20,
          poleGap: 0.01,
          // dashArray: "2,4"
        },
        {
          minZoom: 2,
          latStep: 5,
          lonStep: 20,
          segmentStep: 1,
          labelEveryLat: 5,
          labelEveryLon: 20,
          poleGap: 0.02,
          // dashArray: "2,4"
        },
        {
          minZoom: 1,
          latStep: 10,
          lonStep: 30,
          segmentStep: 1,
          labelEveryLat: 10,
          labelEveryLon: 30,
          poleGap: 0.05,
          // dashArray: "2,4"
        },
      ],
    },
  },
  snapshots: [dayBeforeYesterdaySnapshot],
  calendarDays: [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28,
  ],
  defaults: {
    baseLayerKey: "cartoDark",
    iceSourceKey: "ASMR2OsiSafIceConc",
    showCoastlines: true,
    showGraticule: true,
    defaultDate: dayBeforeYesterdaySnapshot.date,
  },
};

export const calendarDays: (number | null)[] = (() => {
  // Generates a Sunday-starting calendar grid for January 2026
  const year = 2026;
  const month = 0; // January (0-based)
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
})();

export const buildTileUrl = (source: TileLayerSource, date: string) =>
  source.urlTemplate
    .replace("{layer}", source.layer)
    .replace("{time}", date)
    .replace("{tileMatrixSet}", source.tileMatrixSet)
    .replace("{format}", source.format)
    .replace("{style}", source.wmtsStyle ?? "");

export const buildLegendUrl = (source: TileLayerSource, date: string) => {
  if (source.legendUrlTemplate) {
    const layer = encodeURIComponent(source.layer);
    const style = encodeURIComponent(
      source.wmtsStyle ?? source.wmsDefaultStyle ?? "",
    );
    return source.legendUrlTemplate
      .replace("{layer}", layer)
      .replace("{style}", style);
  }

  if (source.kind === "wms") {
    const base = buildWmsUrl(source, date);
    const params = new URLSearchParams({
      service: "WMS",
      request: "GetLegendGraphic",
      format: "image/png",
      layer: source.layer,
      style: source.wmsDefaultStyle ?? "",
      colorbaronly: "true",
      width: "320",
      height: "32",
      colorbarwidth: "320",
      colorbarheight: "32",
    });
    if (source.wmsPalette) {
      params.set("palette", source.wmsPalette);
    }
    if (source.wmsColorScaleRange) {
      params.set("colorscalerange", source.wmsColorScaleRange);
    }
    if (source.wmsNumColorBands) {
      params.set("numcolorbands", String(source.wmsNumColorBands));
    }
    if (source.wmsLogScale) {
      params.set("logscale", "true");
    }
    return `${base}?${params.toString()}`;
  }

  return "";
};

export const buildLegendJsonUrl = (source: TileLayerSource) => {
  if (!source.legendJsonUrlTemplate) return "";
  const layer = encodeURIComponent(source.layer);
  const style = encodeURIComponent(
    source.wmtsStyle ?? source.wmsDefaultStyle ?? "",
  );
  return source.legendJsonUrlTemplate
    .replace("{layer}", layer)
    .replace("{style}", style);
};

export const buildLegendMetaUrl = (source: TileLayerSource, date: string) => {
  if (source.kind !== "wms") return "";
  const base = buildWmsUrl(source, date);
  const params = new URLSearchParams({
    service: "WMS",
    request: "GetMetadata",
    item: "layerDetails",
    layerName: source.layer,
  });
  return `${base}?${params.toString()}`;
};

export const buildWmsUrl = (source: TileLayerSource, date: string) => {
  const [year, month, day] = date.split("-");
  const ymd = `${year}${month}${day}`;
  return source.urlTemplate
    .replace("{YYYY}", year)
    .replace("{MM}", month)
    .replace("{DD}", day)
    .replace("{YYYYMMDD}", ymd);
};

export const buildFileUrlFromTemplate = (template: string, date: string) => {
  const [year, month, day] = date.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = new Date(Number(year), monthIndex, 1).toLocaleString(
    "en-US",
    { month: "short" },
  );
  const paddedMonth = String(monthIndex + 1).padStart(2, "0");
  const ymd = `${year}${paddedMonth}${day}`;
  const monthShortLower = monthName.toLowerCase();

  return template
    .replace("{year}", year)
    .replace("{YYYY}", year)
    .replace("{month}", paddedMonth)
    .replace("{MM}", paddedMonth)
    .replace("{day}", day)
    .replace("{DD}", day)
    .replace("{monthName}", monthName)
    .replace("{monthNameLower}", monthShortLower)
    .replace("{monthShortLower}", monthShortLower)
    .replace("{ymd}", ymd)
    .replace("{YYYYMMDD}", ymd);
};

export const buildGeoTiffUrl = (source: TileLayerSource, date: string) => {
  return buildFileUrlFromTemplate(source.urlTemplate, date);
};
