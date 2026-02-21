"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/LanguageProvider";
import type {
  DatasetResponse,
  OverlaySource,
  TileLayerSource,
} from "@/lib/datasets";
import {
  buildGeoTiffUrl,
  buildTileUrl,
  isGraticuleSource,
  buildWmsUrl,
} from "@/lib/datasets";
import { getSourceDescription } from "@/lib/i18n";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataLayersPanelProps {
  dataset: DatasetResponse | null;
  iceSourceKey: string;
  setIceSourceKey: Dispatch<SetStateAction<string>>;
  baseLayerKey: string;
  setBaseLayerKey: Dispatch<SetStateAction<string>>;
  showCoastlines: boolean;
  setShowCoastlines: Dispatch<SetStateAction<boolean>>;
  showGraticule: boolean;
  setShowGraticule: Dispatch<SetStateAction<boolean>>;
  activeIceSource?: TileLayerSource;
  activeBaseLayer?: TileLayerSource;
  title?: string;
}

export default function DataLayersPanel({
  dataset,
  iceSourceKey,
  setIceSourceKey,
  baseLayerKey,
  setBaseLayerKey,
  showCoastlines,
  setShowCoastlines,
  showGraticule,
  setShowGraticule,
  activeIceSource,
  activeBaseLayer,
  title,
}: DataLayersPanelProps) {
  const { t, locale } = useLanguage();
  const resolvedTitle = title ?? t("dataAndLayers");
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [openCatalogItems, setOpenCatalogItems] = useState<Record<string, boolean>>({});
  const sampleDate =
    dataset?.defaults.defaultDate ?? dataset?.snapshots?.[0]?.date ?? "";

  const toggleCatalogItem = (id: string) => {
    setOpenCatalogItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isCatalogItemOpen = (id: string) => Boolean(openCatalogItems[id]);

  const renderTileLayer = (source: TileLayerSource) => {
    const resolvedKind = source.kind ?? "wmts";
    const localizedDescription = getSourceDescription(
      locale,
      source.id,
      source.description,
    );

    return (
      <li
        key={source.id}
        className="rounded-md border border-slate-800 bg-slate-900/60 p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-base font-semibold text-slate-200">{source.label}</p>
              <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-200">
                {source.format.toUpperCase()}
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-200">
                {resolvedKind.toUpperCase()}
              </span>
            </div>
            <p className="text-[13px] text-slate-400">
              {t("attributionLabel")}:{" "}
              {source.infoUrl ? (
                <a
                  href={source.infoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-300 underline decoration-slate-600 underline-offset-2"
                >
                  by {source.attribution}
                </a>
              ) : (
                <span>{source.attribution}</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-slate-700 bg-transparent px-2 text-[13px] text-slate-300"
            onClick={() => toggleCatalogItem(source.id)}
          >
            {isCatalogItemOpen(source.id)
              ? t("hideDetails")
              : t("showDetails")}
          </Button>
        </div>
        {isCatalogItemOpen(source.id) && (
          <div className="mt-2 space-y-2 text-[13px] text-slate-400">
            <p className="text-slate-100">{localizedDescription}</p>
            <p>
              {t("sampleUrlLabel")}:{" "}
              <span className="break-all text-slate-300 opacity-60">
                {source.kind === "geotiff"
                  ? buildGeoTiffUrl(source, sampleDate)
                  : source.kind === "wms"
                    ? buildWmsUrl(source, sampleDate)
                    : buildTileUrl(source, sampleDate)}
              </span>
            </p>
          </div>
        )}
      </li>
    );
  };

  const renderGraticuleLayer = (source: OverlaySource) => {
    if (!isGraticuleSource(source)) return null;
    const localizedDescription = getSourceDescription(
      locale,
      source.id,
      source.description,
    );
    return (
      <li
        key={source.id}
        className="rounded-md border border-slate-800 bg-slate-900/60 p-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-base font-semibold text-slate-200">
              {source.label}
            </p>
            <p className="text-[13px] text-slate-400">
              {t("attributionLabel")}: {source.attribution}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-slate-700 bg-transparent px-2 text-[13px] text-slate-300"
            onClick={() => toggleCatalogItem(source.id)}
          >
            {isCatalogItemOpen(source.id)
              ? t("hideDetails")
              : t("showDetails")}
          </Button>
        </div>
        {isCatalogItemOpen(source.id) && (
          <div className="mt-2 space-y-2 text-[13px] text-slate-400">
            <p className="text-slate-100">{localizedDescription}</p>
            <p>
              Step: {source.latStep}° / {source.lonStep}°
            </p>
            <p>
              Extent: {source.minLat}° to {source.maxLat}°
            </p>
          </div>
        )}
      </li>
    );
  };

  const renderOverlay = (source: OverlaySource) =>
    isGraticuleSource(source)
      ? renderGraticuleLayer(source)
      : renderTileLayer(source);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex w-full justify-between items-center my-[-10px]">
            <div>{resolvedTitle}</div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-slate-600 bg-transparent text-slate-200"
              onClick={() => setIsCatalogOpen(true)}
            >
              {t("layerCatalogOpen")}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-slate-400">
        <div className="space-y-2">
          <p className="text-slate-300">{t("dataSource")}</p>
          <Select
            value={iceSourceKey || "__none__"}
            onValueChange={(value: string) =>
              setIceSourceKey(value === "__none__" ? "" : value)
            }
          >
            <SelectTrigger
              aria-label={t("dataSource")}
              className="w-full border-slate-700 bg-slate-900/60 text-xs text-slate-200"
            >
              <SelectValue placeholder={t("selectData")} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 text-slate-200">
              <SelectGroup>
                <SelectItem value="__none__" className="text-xs">
                  {t("selectData")}
                </SelectItem>
                {Object.entries(dataset?.iceSources ?? {}).map(
                  ([key, source]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {source.label}
                    </SelectItem>
                  ),
                )}
              </SelectGroup>
            </SelectContent>
          </Select>

          <div className="text-[11px] text-slate-500">
            {activeIceSource?.infoUrl ? (
              <a
                href={activeIceSource.infoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-300 underline decoration-slate-600 underline-offset-2"
              >
                by {activeIceSource.attribution}
              </a>
            ) : (
              <span>{t("selectDataToViewInfo")}</span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-slate-300">{t("baseMap")}</p>
          <Select
            value={baseLayerKey || "__none__"}
            onValueChange={(value: string) =>
              setBaseLayerKey(value === "__none__" ? "" : value)
            }
          >
            <SelectTrigger
              aria-label={t("baseMap")}
              className="w-full border-slate-700 bg-slate-900/60 text-xs text-slate-200"
            >
              <SelectValue placeholder={t("selectData")} />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 text-slate-200">
              <SelectGroup>
                <SelectItem value="__none__" className="text-xs">
                  {t("selectData")}
                </SelectItem>
                {Object.entries(dataset?.baseLayers ?? {}).map(
                  ([key, layer]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {layer.label}
                    </SelectItem>
                  ),
                )}
              </SelectGroup>
            </SelectContent>
          </Select>

          <p className="text-[11px] text-slate-500">
            {activeBaseLayer ? (
              <a
                href={activeBaseLayer.infoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-300 underline decoration-slate-600 underline-offset-2"
              >
                by {activeBaseLayer.attribution}
              </a>
            ) : (
              <span>{t("selectBasemapToViewInfo")}</span>
            )}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showCoastlines}
            onChange={(event) => setShowCoastlines(event.target.checked)}
            className="h-3 w-3 accent-sky-400"
          />
          {t("showCoastlines")}
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showGraticule}
            onChange={(event) => setShowGraticule(event.target.checked)}
            className="h-3 w-3 accent-sky-400"
          />
          {t("showGraticule")}
        </label>
      </CardContent>
      {isCatalogOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 p-4"
          onClick={() => setIsCatalogOpen(false)}
        >
          <Card
            className="flex h-[90vh] w-[95vw] max-w-6xl flex-col border-slate-700 bg-slate-900 text-slate-100"
            onClick={(event) => event.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("layerCatalogTitle")}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-500/70 bg-red-500/20 text-red-100 hover:border-red-400 hover:bg-red-500/30"
                  onClick={() => setIsCatalogOpen(false)}
                >
                  {t("close")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto space-y-6 text-sm text-slate-300 scrollbar-dark">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  {t("baseLayersLabel")}
                </p>

                <ul className="mt-2 space-y-3">
                  {dataset
                    ? Object.values(dataset.baseLayers).map(renderTileLayer)
                    : t("loading")}
                </ul>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  {t("iceSourcesLabel")}
                </p>
                <ul className="mt-2 space-y-3">
                  {dataset
                    ? Object.values(dataset.iceSources).map(renderTileLayer)
                    : t("loading")}
                </ul>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  {t("overlaysLabel")}
                </p>
                <ul className="mt-2 space-y-3">
                  {dataset
                    ? Object.values(dataset.overlays).map(renderOverlay)
                    : t("loading")}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
