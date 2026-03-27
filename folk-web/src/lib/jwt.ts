/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * Se usa para decisiones de UX; la autorización real sigue en backend.
 */
export interface JwtPayload {
  user_id: number;
  username: string;
  email: string;
  is_staff: boolean;
  organizador_id: number | null;
  is_participante: boolean;
  participante_ids: number[];
  is_juez: boolean;
  exp: number;
}

function decodeBase64Url(base64Url: string): string {
  const normalized = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split(".")[1];
    const json = decodeBase64Url(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
