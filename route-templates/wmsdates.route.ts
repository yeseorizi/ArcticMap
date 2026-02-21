import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const cache = new Map<string, { at: number; dates: string[] }>();

const allowedHosts = new Set(["thredds.met.no"]);

const catalogRefRegex = /<catalogRef[^>]*xlink:href="([^"]+)"/g;
const ncDateRegex = /(?:^|[^0-9])(20\d{2})(\d{2})(\d{2})(?:\d{4})?\.nc\b/g;
const yearCatalogRefRegex = /^\d{4}\/catalog\.xml(?:\?.*)?$/;
const monthCatalogRefRegex = /^\d{2}\/catalog\.xml(?:\?.*)?$/;

async function fetchText(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractRefs(xml: string) {
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = catalogRefRegex.exec(xml))) {
    refs.push(match[1]);
  }
  return refs;
}

function extractDates(xml: string, layer?: string) {
  const scopedXml = layer && xml.includes(layer) ? xml : xml;
  const dates = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = ncDateRegex.exec(scopedXml))) {
    const yyyy = match[1];
    const mm = match[2];
    const dd = match[3];
    dates.add(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await worker(current));
    }
  });
  await Promise.all(runners);
  return results;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const root = searchParams.get("root");
  const layer = searchParams.get("layer") ?? "";
  if (!root) return new NextResponse("Missing root", { status: 400 });

  let base: URL;
  try {
    base = new URL(root);
  } catch {
    return new NextResponse("Invalid root", { status: 400 });
  }

  if (!allowedHosts.has(base.host)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  const cacheKey = `${base.toString()}::${layer}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ dates: cached.dates });
  }

  const rootUrl = base.toString().endsWith("/catalog.xml")
    ? base.toString()
    : `${base.toString().replace(/\/$/, "")}/catalog.xml`;

  try {
    const rootXml = await fetchText(rootUrl);
    const dates = new Set<string>();
    for (const date of extractDates(rootXml, layer)) {
      dates.add(date);
    }

    const yearRefs = extractRefs(rootXml).filter((ref) => yearCatalogRefRegex.test(ref));
    const yearUrls = yearRefs.map((ref) => new URL(ref, rootUrl).toString());

    const monthUrls = (
      await mapLimit(yearUrls, 4, async (yearUrl) => {
        const xml = await fetchText(yearUrl);
        for (const date of extractDates(xml, layer)) {
          dates.add(date);
        }
        const monthRefs = extractRefs(xml).filter((ref) => monthCatalogRefRegex.test(ref));
        return monthRefs.map((ref) => new URL(ref, yearUrl).toString());
      })
    ).flat();

    await mapLimit(monthUrls, 6, async (monthUrl) => {
      const xml = await fetchText(monthUrl);
      for (const date of extractDates(xml, layer)) {
        dates.add(date);
      }
    });

    const sorted = Array.from(dates).sort();
    if (sorted.length === 0) {
      return new NextResponse("No dates found", { status: 404 });
    }
    cache.set(cacheKey, { at: Date.now(), dates: sorted });

    return NextResponse.json({ dates: sorted });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(message, { status: 500 });
  }
}
