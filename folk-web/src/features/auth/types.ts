export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface Participacion {
  id: number;
  nombre_completo: string;
  estado: "pendiente_validacion" | "activo" | "rechazado";
  evento_id: number;
  "evento__nombre": string;
  "evento__slug": string;
}

export interface MeResponse {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  organizador_id: number | null;
  is_participante: boolean;
  participaciones: Participacion[];
}
