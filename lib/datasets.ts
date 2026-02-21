export type TileLayerSource = {
  id: string;
  label: string;
  layer: string;
  tileMatrixSet: string;
  description: string;
  format: "jpg" | "jpeg" | "png" | "tif" | "nc";
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
const noaaGeoTiffTemplate =
  "https://noaadata.apps.nsidc.org/NOAA/G02135/north/daily/geotiff/{year}/{month}_{monthName}/N_{ymd}_concentration_v4.0.tif";
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
    center: [90, 0],
    initialZoom: 1,
    minZoom: 0,
    maxZoom: 7,
    maxBounds: [
      [50, -180],
      [90, 180],
    ],
  },
  baseLayers: {
    blueMarble: {
      id: "blueMarble",
      label: "Blue Marble",
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
      label: "Blue Marble Bathymetry",
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
      label: "Sea Ice Concentration, OSI SAF GLOBAL (ASMR2)",
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
      wmtsStyle: "cmap:ice",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      legendOrientation: "vertical",
      wmtsCapabilitiesUrl: copernicusGlobalSeaIceWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
      bounds: [
        [-180, 30],
        [179.9, 90],
      ],
    },
    osiSafAmsr2Wms: {
      id: "osiSafAmsr2Wms",
      label: "Sea Ice Concentration, OSI SAF OSI-408-a (ASMR2) (Slow)",
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
      wmsPalette: "rainbow",
      wmsColorScaleRange: "0,100",
      legendOrientation: "vertical",
      wmsCatalogRoot:
        "https://thredds.met.no/thredds/catalog/osisaf/met.no/ice/amsr2_conc",
    },
    arcSicNrtViridis: {
      id: "arcSicNrtViridis",
      label: "Sea Ice Concentration, High Resolution L4",
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
      sourceProjection: "EPSG:4326",
      wrapX: true,
      bounds: [
        [-179.995, 31.005],
        [179.995, 89.995],
      ],
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
      label: "[neXtSIM] Sea Ice Concentration forcast (Linear Scale)",
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
      wmtsStyle: "cmap:ice",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceConcentrationLog: {
      id: "nextSimSeaIceConcentrationLog",
      label: "[neXtSIM] Sea Ice Concentration forcast (Log Scale)",
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
      wmtsStyle: "cmap:ice,logScale",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceThickness: {
      id: "nextSimSeaIceThickness",
      label: "[neXtSIM] Sea Ice Thickness forcast (Linear Scale)",
      description:
        "The Arctic Sea Ice Analysis and Forecast system uses the neXtSIM stand-alone sea ice model running the Brittle-Bingham-Maxwell sea ice rheology on an adaptive triangular mesh of 10 km average cell length. The model domain covers the whole Arctic domain, including the Canadian Archipelago and the Bering Sea. neXtSIM is forced with surface atmosphere forcings from the ECMWF (European Centre for Medium-Range Weather Forecasts) and ocean forcings from TOPAZ5, the ARC MFC PHY NRT system (002_001a). neXtSIM runs daily, assimilating manual ice charts, sea ice thickness from CS2SMOS in winter and providing 9-day forecasts. The output variables are the ice concentrations, ice thickness, ice drift velocity, snow depths, sea ice type, sea ice age, ridge volume fraction and albedo, provided at hourly frequency. The adaptive Lagrangian mesh is interpolated for convenience on a 3 km resolution regular grid in a Polar Stereographic projection. The projection is identical to other ARC MFC products.",
      layer:
        "ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011/cmems_mod_arc_phy_anfc_nextsim_hm_202311/sithick",
      tileMatrixSet: "EPSG:4326",
      format: "png",
      attribution: "Copernicus Marine Service",
      infoUrl:
        "https://data.marine.copernicus.eu/product/ARCTIC_ANALYSISFORECAST_PHY_ICE_002_011",
      urlTemplate: copernicusWmtsTemplate,
      opacity: 0.8,
      kind: "wmts",
      wmtsStyle: "cmap:ice",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceThicknessLog: {
      id: "nextSimSeaIceThicknessLog",
      label: "[neXtSIM] Sea Ice Thickness forcast (Log Scale)",
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
      wmtsStyle: "cmap:ice,logScale",
      legendUrlTemplate: copernicusWmtsLegendTemplate,
      legendJsonUrlTemplate: copernicusWmtsLegendJsonTemplate,
      wmtsCapabilitiesUrl: copernicusNextSimWmtsCapabilitiesUrl,
      sourceProjection: "EPSG:4326",
      wrapX: true,
    },
    nextSimSeaIceVelocity: {
      id: "nextSimSeaIceVelocity",
      label: "[neXtSIM] Sea Ice Velocity forcast (Linear Vector)",
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
      label: "[neXtSIM] Sea Ice Velocity forcast (Log Vector)",
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
      id: "coastlines_nasa",
      label: "Coastlines NASA GIBS",
      description: "Coastlines from NASA GIBS",
      layer: "Coastlines",
      tileMatrixSet: "250m",
      format: "png",
      attribution: "NASA GIBS",
      urlTemplate: gibsStaticUrlTemplate,
      opacity: 0.9,
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
    baseLayerKey: "",
    iceSourceKey: "",
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

export const buildGeoTiffUrl = (source: TileLayerSource, date: string) => {
  const [year, month, day] = date.split("-");
  const monthIndex = Number(month) - 1;
  const monthName = new Date(Number(year), monthIndex, 1).toLocaleString(
    "en-US",
    { month: "short" },
  );
  const paddedMonth = String(monthIndex + 1).padStart(2, "0");
  return source.urlTemplate
    .replace("{year}", year)
    .replace("{month}", paddedMonth)
    .replace("{monthName}", monthName)
    .replace("{ymd}", `${year}${paddedMonth}${day}`);
};
