import { NextRequest, NextResponse } from "next/server";

import {
  REFRESH_COOKIE,
  clearSessionCookies,
  getBackendApiUrl,
} from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;

  if (refresh) {
    try {
      await fetch(getBackendApiUrl("/api/v1/auth/token/blacklist/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh }),
        cache: "no-store",
      });
    } catch {
      // Si no podemos invalidar en backend, igual limpiamos la sesión local.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
