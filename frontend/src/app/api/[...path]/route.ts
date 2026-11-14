import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ path: string[] }> };

/**
 * Authoritative Next.js API Gateway / Catch-all Proxy.
 * 
 * Routes all API requests to the authoritative Express / PostgreSQL backend.
 * Preserves upstream HTTP statuses and errors.
 * Returns an explicit 503 when the backend is unreachable, or 504 on timeout.
 * Stateful demo fallbacks have been removed to prevent state illusions.
 */

async function handleProxy(req: NextRequest, { params }: RouteContext): Promise<Response> {
  const { path } = await params;
  const pathStr = path.map(encodeURIComponent).join('/');
  const configuredBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  const backendBase = configuredBase || (!process.env.VERCEL ? 'http://127.0.0.1:5001/api' : undefined);
  const requestId = crypto.randomUUID();
  if (!backendBase || !/^https?:\/\//.test(backendBase)) {
    console.error(JSON.stringify({ event: 'api.upstream_unconfigured', requestId }));
    return NextResponse.json(
      { success: false, error: 'Zenith backend is unavailable.', code: 'BACKEND_UNAVAILABLE', requestId },
      { status: 503, headers: { 'x-request-id': requestId } },
    );
  }

  const timeoutMs = parseInt(process.env.BACKEND_TIMEOUT_MS || '3000', 10);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const targetUrl = `${backendBase.replace(/\/+$/, '')}/${pathStr}${req.nextUrl.search}`;
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('content-length');
    headers.set('x-request-id', requestId);

    const method = req.method;
    let body: any = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      try {
        body = await req.clone().text();
      } catch (e) {
        // ignore body clone issues
      }
    }

    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    // Read upstream body and headers, preserving upstream status code and content
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');
    responseHeaders.set('x-request-id', requestId);

    const responseBody = method === 'HEAD' || [204, 205, 304].includes(upstreamResponse.status)
      ? null
      : await upstreamResponse.text();
    return new Response(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(JSON.stringify({ event: 'api.upstream_failed', requestId, method: req.method, timeout: controller.signal.aborted }));

    if (controller.signal.aborted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstream gateway timeout. Express backend took longer than timeout threshold.',
          code: 'BACKEND_TIMEOUT',
          requestId,
        },
        { status: 504, headers: { 'x-request-id': requestId } }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Upstream service unavailable. Express backend is unreachable.',
        code: 'BACKEND_UNAVAILABLE',
        requestId,
      },
      { status: 503, headers: { 'x-request-id': requestId } }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function HEAD(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}
