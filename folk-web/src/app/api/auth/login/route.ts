import { NextRequest, NextResponse } from "next/server";

import {
  buildSessionFromAccessToken,
  getBackendApiUrl,
  setSessionCookies,
} from "@/lib/server-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const credentials = await request.json();

  const response = await fetch(getBackendApiUrl("/api/v1/auth/token/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(credentials),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access || !data?.refresh) {
    return NextResponse.json(
      data ?? { detail: "No fue posible iniciar sesión." },
      { status: response.status || 500 }
    );
  }

  const session = buildSessionFromAccessToken(data.access);
  const nextResponse = NextResponse.json({ session });
  setSessionCookies(nextResponse, data.access, data.refresh);
  return nextResponse;
}
