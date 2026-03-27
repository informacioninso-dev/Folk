import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decodeJwt } from "@/lib/jwt";

const PUBLIC_PATHS = [
  "/login", "/registro", "/ranking", "/forgot-password", "/reset-password",
  "/evento",  // portal público de eventos
];

function getHomeForRole(payload: { is_staff: boolean; organizador_id?: number | null; is_juez?: boolean; is_participante?: boolean }): string {
  if (payload.is_staff)        return "/superadmin";
  if (payload.organizador_id)  return "/eventos";
  if (payload.is_juez)         return "/calificar";
  if (payload.is_participante) return "/mi-inscripcion";
  return "/calificar"; // usuario sin rol definido, probablemente juez
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("folk_access")?.value;

  const isPublic =
    pathname === "/" ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!token && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /evento/* y / son públicos incluso con sesión activa (no redirigir)
  if (token && isPublic && pathname !== "/" && !pathname.startsWith("/evento")) {
    const payload = decodeJwt(token);
    if (payload) {
      return NextResponse.redirect(new URL(getHomeForRole(payload), request.url));
    }
  }

  if (token) {
    const payload = decodeJwt(token);
    if (!payload) return NextResponse.next();

    const isSuperadminRoute   = pathname.startsWith("/superadmin");
    const isParticipanteRoute = pathname.startsWith("/mi-inscripcion");
    const isOrganizerRoute    = pathname.startsWith("/eventos") || pathname.startsWith("/calificaciones");

    // Superadmin: solo puede ir a /superadmin
    if (isSuperadminRoute && !payload.is_staff) {
      return NextResponse.redirect(new URL(getHomeForRole(payload), request.url));
    }

    // Participante: solo puede ir a /mi-inscripcion
    if (isOrganizerRoute && payload.is_participante && !payload.is_staff) {
      return NextResponse.redirect(new URL("/mi-inscripcion", request.url));
    }

    // Organizer: no puede ir a /mi-inscripcion
    if (isParticipanteRoute && !payload.is_participante && !payload.is_staff) {
      return NextResponse.redirect(new URL(getHomeForRole(payload), request.url));
    }

    // Juez puro (sin organizador): no puede ir a rutas de organizador
    if (isOrganizerRoute && payload.is_juez && !payload.organizador_id && !payload.is_staff) {
      return NextResponse.redirect(new URL("/calificar", request.url));
    }

    // Juez: bloquear acceso a /calificar si no tiene asignaciones de juez
    // (no redirigir — puede haber usuarios normales ahí temporalmente)
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
