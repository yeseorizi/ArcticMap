import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const cache = new Map<string, { at: number; dates: string[] }>();

const allowedHosts = new Set(["wmts.marine.copernicus.eu"]);

const layerRegex = /<Layer\b[\s\S]*?<\/Layer>/g;
const identifierRegex = /<ows:Identifier>([^<]+)<\/ows:Identifier>/i;
const dimensionRegex = /<(?:ows:)?Dimension>[\s\S]*?<\/(?:ows:)?Dimension>/g;
const timeIdentifierRegex = /<ows:Identifier>\s*time\s*<\/ows:Identifier>/i;
const valueRegex = /<Value>([^<]+)<\/Value>/i;
const layerVersionSuffixRegex = /_20\d{4}(?=\/|$)/g;

type LayerTimeRange = {
  identifier: string;
  value: string;
};

async function fetchText(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`Capabilities fetch failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractLayerTimeRanges(xml: string): LayerTimeRange[] {
  const ranges: LayerTimeRange[] = [];
  const layers = xml.match(layerRegex) ?? [];
  for (const layerXml of layers) {
    const idMatch = layerXml.match(identifierRegex);
    if (!idMatch) continue;

    const dimensions = layerXml.match(dimensionRegex) ?? [];
    for (const dimensionXml of dimensions) {
      if (!timeIdentifierRegex.test(dimensionXml)) continue;
      const valueMatch = dimensionXml.match(valueRegex);
      if (valueMatch) {
        ranges.push({
          identifier: idMatch[1].trim(),
          value: valueMatch[1].trim(),
        });
        break;
      }
    }
  }
  return ranges;
}

function normalizeLayerId(layerId: string) {
  return layerId.trim().toLowerCase().replace(layerVersionSuffixRegex, "");
}

function extractTimeRange(xml: string, layerId: string) {
  const ranges = extractLayerTimeRanges(xml);
  const requestedId = layerId.trim();

  const exact = ranges.find((range) => range.identifier === requestedId);
  if (exact) return exact.value;

  const normalizedRequested = normalizeLayerId(requestedId);
  const normalizedMatches = ranges.filter(
    (range) => normalizeLayerId(range.identifier) === normalizedRequested,
  );
  if (normalizedMatches.length > 0) {
    return normalizedMatches[normalizedMatches.length - 1].value;
  }

  const requestedParts = normalizedRequested.split("/");
  const requestedLeaf = requestedParts[requestedParts.length - 1];
  const requestedPrefix = requestedParts.slice(0, -1).join("/");
  if (!requestedLeaf) return null;

  const leafMatches = ranges.filter((range) => {
    const parts = normalizeLayerId(range.identifier).split("/");
    return parts[parts.length - 1] === requestedLeaf;
  });
  if (leafMatches.length === 0) return null;
  if (!requestedPrefix) {
    return leafMatches[leafMatches.length - 1].value;
  }

  const prefixMatches = leafMatches.filter((range) =>
    normalizeLayerId(range.identifier).startsWith(requestedPrefix),
  );
  if (prefixMatches.length > 0) {
    return prefixMatches[prefixMatches.length - 1].value;
  }

  return leafMatches[leafMatches.length - 1].value;
}

function buildDailyDates(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid time range");
  }

  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const dates: string[] = [];
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function parseDateToken(value: string) {
  const token = value.trim();
  if (!token) return null;

  const dateLike = token.includes("T") ? token.slice(0, 10) : token;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateLike)) {
    return dateLike;
  }
  if (/^\d{8}$/.test(token)) {
    const yyyy = token.slice(0, 4);
    const mm = token.slice(4, 6);
    const dd = token.slice(6, 8);
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

function parseTimeDimensionValue(value: string) {
  if (value.includes("/")) {
    const [start, end] = value.split("/");
    if (start && end) {
      return buildDailyDates(start, end);
    }
    return [];
  }

  const dates = value
    .split(",")
    .map((token) => parseDateToken(token))
    .filter((token): token is string => !!token);

  return Array.from(new Set(dates)).sort();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const layer = searchParams.get("layer");
  if (!url || !layer) {
    return new NextResponse("Missing url or layer", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!allowedHosts.has(target.host)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  const cacheKey = `${target.toString()}::${layer}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ dates: cached.dates });
  }

  try {
    const xml = await fetchText(target.toString());
    const timeValue = extractTimeRange(xml, layer);
    if (!timeValue) {
      return new NextResponse("Time range not found", { status: 404 });
    }

    const dates = parseTimeDimensionValue(timeValue);
    if (dates.length === 0) {
      return new NextResponse("Invalid time range", { status: 500 });
    }

    cache.set(cacheKey, { at: Date.now(), dates });
    return NextResponse.json({ dates });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(message, { status: 500 });
  }
}
