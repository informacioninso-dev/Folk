/**
 * Decodifica el payload de un JWT sin verificar la firma.
 * Válido en cliente (la firma ya fue verificada por el servidor).
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

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
