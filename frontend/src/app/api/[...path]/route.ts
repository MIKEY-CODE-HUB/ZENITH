import { NextRequest, NextResponse } from 'next/server';

/**
 * Authoritative Next.js API Gateway / Catch-all Proxy.
 * 
 * Routes all API requests to the authoritative Express / PostgreSQL backend.
 * Preserves upstream HTTP statuses and errors.
 * Returns an explicit 503 when the backend is unreachable, or 504 on timeout.
 * Stateful demo fallbacks have been removed to prevent state illusions.
 */

function getBackendBase(): string {
  return process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/api';
}

async function handleProxy(req: NextRequest, { params }: { params: { path?: string[] } }): Promise<Response> {
  const pathArr = params.path || [];
  const pathStr = pathArr.join('/');
  const backendBase = getBackendBase();

  const timeoutMs = parseInt(process.env.BACKEND_TIMEOUT_MS || '3000', 10);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const targetUrl = `${backendBase}/${pathStr}${req.nextUrl.search}`;
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('content-length');

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

    clearTimeout(timeoutId);

    // Read upstream body and headers, preserving upstream status code and content
    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete('content-encoding');

    const responseBody = await upstreamResponse.text();
    return new Response(responseBody, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstream gateway timeout. Express backend took longer than timeout threshold.',
          code: 'BACKEND_TIMEOUT',
          path: `/api/${pathStr}`,
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Upstream service unavailable. Express backend is unreachable.',
        code: 'BACKEND_UNAVAILABLE',
        path: `/api/${pathStr}`,
      },
      { status: 503 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return handleProxy(req, ctx);
}

export async function HEAD(req: NextRequest, ctx: { params: { path?: string[] } }) {
  return handleProxy(req, ctx);
}
