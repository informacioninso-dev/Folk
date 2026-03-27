import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  getBackendApiUrl,
  refreshAccessToken,
  setSessionCookies,
} from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    path: string[];
  };
};

function buildForwardHeaders(request: NextRequest, accessToken?: string) {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const contentType = request.headers.get("content-type");

  if (accept) headers.set("accept", accept);
  if (contentType) headers.set("content-type", contentType);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  return headers;
}

async function getForwardBody(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

async function forwardRequest(
  request: NextRequest,
  backendPath: string,
  body: ArrayBuffer | undefined,
  accessToken?: string
) {
  return fetch(backendPath, {
    method: request.method,
    headers: buildForwardHeaders(request, accessToken),
    body,
    cache: "no-store",
    redirect: "manual",
  });
}

function toProxyResponse(response: Response) {
  const headers = new Headers(response.headers);
  headers.delete("set-cookie");
  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}

async function handleRequest(request: NextRequest, context: RouteContext) {
  const path = context.params.path.join("/");
  const backendUrl = getBackendApiUrl(`/api/v1/${path}${request.nextUrl.search}`);
  const body = await getForwardBody(request);

  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  let backendResponse = await forwardRequest(request, backendUrl, body, access);

  if (backendResponse.status !== 401) {
    return toProxyResponse(backendResponse);
  }

  if (!refresh) {
    const unauthorizedResponse = toProxyResponse(backendResponse);
    clearSessionCookies(unauthorizedResponse);
    return unauthorizedResponse;
  }

  const rotatedTokens = await refreshAccessToken(refresh);
  if (!rotatedTokens) {
    const unauthorizedResponse = toProxyResponse(backendResponse);
    clearSessionCookies(unauthorizedResponse);
    return unauthorizedResponse;
  }

  backendResponse = await forwardRequest(
    request,
    backendUrl,
    body,
    rotatedTokens.access
  );

  const proxyResponse = toProxyResponse(backendResponse);
  setSessionCookies(proxyResponse, rotatedTokens.access, rotatedTokens.refresh);
  return proxyResponse;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}
