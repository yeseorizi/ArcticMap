import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedHosts = [
  "noaadata.apps.nsidc.org",
  "nsidc.org",
  "seaice.uni-bremen.de",
  "data.seaice.uni-bremen.de",
  "geos.polarview.aq",
  "thredds.met.no",
  "www.dropbox.com",
  "dl.dropboxusercontent.com",
];

const resolveTarget = (req: Request) => {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return null;

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return null;
  }

  for (const [key, value] of searchParams.entries()) {
    if (key === "url") continue;
    target.searchParams.set(key, value);
  }
  return target;
};

const proxyRequest = async (req: Request, method: "GET" | "HEAD") => {
  const target = resolveTarget(req);
  if (!target) return new NextResponse("Invalid url", { status: 400 });

  if (!allowedHosts.includes(target.host)) {
    return new NextResponse("Host not allowed", { status: 403 });
  }

  try {
    const requestHeaders = new Headers({
      "User-Agent": "Mozilla/5.0",
    });
    const range = req.headers.get("range");
    if (range) {
      requestHeaders.set("Range", range);
    }

    const upstream = await fetch(target.toString(), {
      method,
      redirect: "follow",
      headers: requestHeaders,
    });

    if (!upstream.ok) {
      return new NextResponse(
        `Upstream error: ${upstream.status} ${upstream.statusText}`,
        { status: upstream.status },
      );
    }

    const responseHeaders = new Headers();
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
        responseHeaders.set(key, value);
      }
    }
    if (!responseHeaders.get("content-type")) {
      responseHeaders.set("content-type", "application/octet-stream");
    }
    if (!responseHeaders.get("cache-control")) {
      responseHeaders.set("cache-control", "public, max-age=3600");
    }

    if (method === "HEAD") {
      return new NextResponse(null, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    if (upstream.body) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return new NextResponse(`Proxy fetch threw: ${message}`, { status: 500 });
  }
};

export async function GET(req: Request) {
  const target = resolveTarget(req);
  if (!target) return new NextResponse("Missing url", { status: 400 });
  return proxyRequest(req, "GET");
}

export async function HEAD(req: Request) {
  const target = resolveTarget(req);
  if (!target) return new NextResponse("Missing url", { status: 400 });
  return proxyRequest(req, "HEAD");
}
