const { app, BrowserWindow } = require("electron");
const path = require("path");
const express = require("express");
const { Readable } = require("stream");

const proxyAllowedHosts = new Set([
  "noaadata.apps.nsidc.org",
  "nsidc.org",
  "seaice.uni-bremen.de",
  "data.seaice.uni-bremen.de",
  "geos.polarview.aq",
  "thredds.met.no",
  "www.dropbox.com",
  "dl.dropboxusercontent.com",
]);

const wmsAllowedHosts = new Set(["thredds.met.no"]);
const wmtsAllowedHosts = new Set(["wmts.marine.copernicus.eu"]);

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const wmsDatesCache = new Map();
const wmtsDatesCache = new Map();

const catalogRefRegex = /<catalogRef[^>]*xlink:href="([^"]+)"/g;
const ncDateRegex = /(?:^|[^0-9])(20\d{2})(\d{2})(\d{2})(?:\d{4})?\.nc\b/g;
const yearCatalogRefRegex = /^\d{4}\/catalog\.xml(?:\?.*)?$/;
const monthCatalogRefRegex = /^\d{2}\/catalog\.xml(?:\?.*)?$/;
const layerRegex = /<Layer\b[\s\S]*?<\/Layer>/g;
const identifierRegex = /<ows:Identifier>([^<]+)<\/ows:Identifier>/i;
const dimensionRegex = /<(?:ows:)?Dimension>[\s\S]*?<\/(?:ows:)?Dimension>/g;
const timeIdentifierRegex = /<ows:Identifier>\s*time\s*<\/ows:Identifier>/i;
const valueRegex = /<Value>([^<]+)<\/Value>/i;
const layerVersionSuffixRegex = /_20\d{4}(?=\/|$)/g;

function getSingleQueryValue(queryValue) {
  if (Array.isArray(queryValue)) return queryValue[0];
  return typeof queryValue === "string" ? queryValue : undefined;
}

function resolveProxyTarget(req) {
  const rawUrl = getSingleQueryValue(req.query.url);
  if (!rawUrl) return null;

  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    return null;
  }

  for (const [key, value] of Object.entries(req.query)) {
    if (key === "url") continue;
    const single = getSingleQueryValue(value);
    if (single !== undefined) {
      target.searchParams.set(key, single);
    }
  }

  return target;
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) {
    throw new Error(`Catalog fetch failed: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function extractRefs(xml) {
  const refs = [];
  let match;
  while ((match = catalogRefRegex.exec(xml))) {
    refs.push(match[1]);
  }
  return refs;
}

function extractWmsDates(xml, layer) {
  const scopedXml = layer && xml.includes(layer) ? xml : xml;
  const dates = new Set();
  let match;
  while ((match = ncDateRegex.exec(scopedXml))) {
    const yyyy = match[1];
    const mm = match[2];
    const dd = match[3];
    dates.add(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function extractLayerTimeRanges(xml) {
  const ranges = [];
  const layers = xml.match(layerRegex) || [];

  for (const layerXml of layers) {
    const idMatch = layerXml.match(identifierRegex);
    if (!idMatch) continue;

    const dimensions = layerXml.match(dimensionRegex) || [];
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

function normalizeLayerId(layerId) {
  return layerId.trim().toLowerCase().replace(layerVersionSuffixRegex, "");
}

function extractTimeRange(xml, layerId) {
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

function buildDailyDates(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid time range");
  }

  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  const dates = [];

  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function parseDateToken(value) {
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

function parseTimeDimensionValue(value) {
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
    .filter((token) => !!token);

  return Array.from(new Set(dates)).sort();
}

async function mapLimit(items, limit, worker) {
  if (items.length === 0) return [];

  const results = new Array(items.length);
  let index = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const current = index;
        index += 1;
        if (current >= items.length) break;
        results[current] = await worker(items[current]);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

async function handleProxy(req, res, method) {
  const target = resolveProxyTarget(req);
  if (!target) {
    res.status(400).send("Invalid url");
    return;
  }

  if (!proxyAllowedHosts.has(target.host)) {
    res.status(403).send("Host not allowed");
    return;
  }

  try {
    const requestHeaders = { "User-Agent": "Mozilla/5.0" };
    if (typeof req.headers.range === "string" && req.headers.range.length > 0) {
      requestHeaders.Range = req.headers.range;
    }

    const upstream = await fetch(target.toString(), {
      method,
      redirect: "follow",
      headers: requestHeaders,
    });

    if (!upstream.ok) {
      res
        .status(upstream.status)
        .send(`Upstream error: ${upstream.status} ${upstream.statusText}`);
      return;
    }

    const passThroughHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
      "content-disposition",
      "cache-control",
    ];

    for (const key of passThroughHeaders) {
      const value = upstream.headers.get(key);
      if (value) {
        res.setHeader(key, value);
      }
    }

    if (!res.getHeader("content-type")) {
      res.setHeader("content-type", "application/octet-stream");
    }
    if (!res.getHeader("cache-control")) {
      res.setHeader("cache-control", "public, max-age=3600");
    }

    res.status(upstream.status);

    if (method === "HEAD") {
      res.end();
      return;
    }

    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.send(buf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).send(`Proxy fetch threw: ${message}`);
  }
}

function getOutDir() {
  // In packaged apps, extraResource ends up in process.resourcesPath
  if (app.isPackaged) return path.join(process.resourcesPath, "out");
  // In dev, your project folder
  return path.join(__dirname, "out");
}

let win;

app.whenReady().then(() => {
  const server = express();
  const outDir = getOutDir();

  server.get("/api/proxy", async (req, res) => {
    await handleProxy(req, res, "GET");
  });

  server.head("/api/proxy", async (req, res) => {
    await handleProxy(req, res, "HEAD");
  });

  server.get("/api/wmsdates", async (req, res) => {
    const root = getSingleQueryValue(req.query.root);
    const layer = getSingleQueryValue(req.query.layer) || "";
    if (!root) {
      res.status(400).send("Missing root");
      return;
    }

    let base;
    try {
      base = new URL(root);
    } catch {
      res.status(400).send("Invalid root");
      return;
    }

    if (!wmsAllowedHosts.has(base.host)) {
      res.status(403).send("Host not allowed");
      return;
    }

    const cacheKey = `${base.toString()}::${layer}`;
    const cached = wmsDatesCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      res.json({ dates: cached.dates });
      return;
    }

    const rootUrl = base.toString().endsWith("/catalog.xml")
      ? base.toString()
      : `${base.toString().replace(/\/$/, "")}/catalog.xml`;

    try {
      const rootXml = await fetchText(rootUrl);
      const dates = new Set();
      for (const date of extractWmsDates(rootXml, layer)) {
        dates.add(date);
      }

      const yearRefs = extractRefs(rootXml).filter((ref) =>
        yearCatalogRefRegex.test(ref),
      );
      const yearUrls = yearRefs.map((ref) => new URL(ref, rootUrl).toString());

      const monthUrls = (
        await mapLimit(yearUrls, 4, async (yearUrl) => {
          const xml = await fetchText(yearUrl);
          for (const date of extractWmsDates(xml, layer)) {
            dates.add(date);
          }
          const monthRefs = extractRefs(xml).filter((ref) =>
            monthCatalogRefRegex.test(ref),
          );
          return monthRefs.map((ref) => new URL(ref, yearUrl).toString());
        })
      ).flat();

      await mapLimit(monthUrls, 6, async (monthUrl) => {
        const xml = await fetchText(monthUrl);
        for (const date of extractWmsDates(xml, layer)) {
          dates.add(date);
        }
      });

      const sorted = Array.from(dates).sort();
      if (sorted.length === 0) {
        res.status(404).send("No dates found");
        return;
      }
      wmsDatesCache.set(cacheKey, { at: Date.now(), dates: sorted });
      res.json({ dates: sorted });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).send(message);
    }
  });

  server.get("/api/wmtsdates", async (req, res) => {
    const url = getSingleQueryValue(req.query.url);
    const layer = getSingleQueryValue(req.query.layer);
    if (!url || !layer) {
      res.status(400).send("Missing url or layer");
      return;
    }

    let target;
    try {
      target = new URL(url);
    } catch {
      res.status(400).send("Invalid url");
      return;
    }

    if (!wmtsAllowedHosts.has(target.host)) {
      res.status(403).send("Host not allowed");
      return;
    }

    const cacheKey = `${target.toString()}::${layer}`;
    const cached = wmtsDatesCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      res.json({ dates: cached.dates });
      return;
    }

    try {
      const xml = await fetchText(target.toString());
      const timeValue = extractTimeRange(xml, layer);
      if (!timeValue) {
        res.status(404).send("Time range not found");
        return;
      }

      const dates = parseTimeDimensionValue(timeValue);
      if (dates.length === 0) {
        res.status(500).send("Invalid time range");
        return;
      }

      wmtsDatesCache.set(cacheKey, { at: Date.now(), dates });
      res.json({ dates });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).send(message);
    }
  });

  server.use(express.static(outDir));

  server.get("/", (req, res) => {
    res.sendFile(path.join(outDir, "index.html"));
  });

  // Optional: SPA-style fallback (if you have client-side routing)
  // server.get("*", (req, res) => {
  //   res.sendFile(path.join(outDir, "index.html"));
  // });

  const listener = server.listen(0, "127.0.0.1", () => {
    const { port } = listener.address();
    win = new BrowserWindow({
      width: 1200,
      height:950,
    });
    win.loadURL(`http://127.0.0.1:${port}/`);
    // win.webContents.openDevTools(); // uncomment to debug
  });
});

app.on('window-all-closed', () => {
  app.quit()
})
