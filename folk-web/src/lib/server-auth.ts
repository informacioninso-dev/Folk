import { NextResponse } from "next/server";

import { decodeJwt, type JwtPayload } from "@/lib/jwt";

export const ACCESS_COOKIE = "folk_access";
export const REFRESH_COOKIE = "folk_refresh";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return (
    ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(normalized) ||
    normalized.endsWith(".local") ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(normalized)
  );
}

function getSecureCookieHint(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return false;
    }
    return !isPrivateHostname(url.hostname);
  } catch {
    return undefined;
  }
}

function isSecureCookie() {
  const forced = process.env.AUTH_COOKIE_SECURE?.toLowerCase();
  if (forced === "true" || forced === "1") return true;
  if (forced === "false" || forced === "0") return false;

  const appHint = getSecureCookieHint(process.env.NEXT_PUBLIC_APP_URL);
  if (typeof appHint === "boolean") {
    return appHint;
  }

  const apiHint = getSecureCookieHint(process.env.NEXT_PUBLIC_API_URL);
  if (typeof apiHint === "boolean") {
    return apiHint;
  }

  return process.env.NODE_ENV === "production";
}

function getBackendBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL no está configurado.");
  }
  return baseUrl.replace(/\/$/, "");
}

export function getBackendApiUrl(pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getBackendBaseUrl()}${normalized}`;
}

export function buildSessionFromAccessToken(access: string) {
  const payload = decodeJwt(access);
  if (!payload) {
    return null;
  }

  return {
    user_id: payload.user_id,
    username: payload.username,
    email: payload.email,
    is_staff: payload.is_staff,
    organizador_id: payload.organizador_id,
    is_participante: payload.is_participante,
    is_juez: payload.is_juez,
    exp: payload.exp,
  } satisfies Pick<
    JwtPayload,
    "user_id" | "username" | "email" | "is_staff" | "organizador_id" | "is_participante" | "is_juez" | "exp"
  >;
}

export function setSessionCookies(
  response: NextResponse,
  access: string,
  refresh: string
) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureCookie(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };

  response.cookies.set({
    name: ACCESS_COOKIE,
    value: access,
    ...cookieOptions,
  });
  response.cookies.set({
    name: REFRESH_COOKIE,
    value: refresh,
    ...cookieOptions,
  });
}

export function clearSessionCookies(response: NextResponse) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isSecureCookie(),
    path: "/",
    maxAge: 0,
  };

  response.cookies.set({ name: ACCESS_COOKIE, value: "", ...cookieOptions });
  response.cookies.set({ name: REFRESH_COOKIE, value: "", ...cookieOptions });
}

export async function refreshAccessToken(refresh: string) {
  const response = await fetch(getBackendApiUrl("/api/v1/auth/token/refresh/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { access: string; refresh?: string };
  if (!data.access) {
    return null;
  }

  return {
    access: data.access,
    refresh: data.refresh ?? refresh,
  };
}
