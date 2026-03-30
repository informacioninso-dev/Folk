import axios from "axios";

// Cliente sin auth para endpoints públicos
const publicClient = axios.create({
  baseURL: "/api/proxy",
  headers: { "Content-Type": "application/json" },
});

export interface EventoHomepage {
  id: number;
  slug: string;
  nombre: string;
  fecha: string;
  ubicacion: string;
  organizador_nombre: string;
  banner_url: string | null;
  destacado: boolean;
  estado: "borrador" | "activa" | "finalizada";
}

export interface FullPassConfig {
  nombre: string;
  precio: string;
  es_requerido: boolean;
}

export interface CategoriaRitmo {
  id: number;
  nombre_ritmo: string;
  modalidad: "solista" | "pareja" | "grupo";
  edad_min: number | null;
  edad_max: number | null;
  precio_adicional: string;
  incluido_full_pass: boolean;
}

export interface EventoPortal {
  id: number;
  slug: string;
  nombre: string;
  fecha: string;
  ubicacion: string;
  organizador_nombre: string;
  banner_url: string | null;
  descripcion_portal: string;
  full_pass: FullPassConfig | null;
  categorias: CategoriaRitmo[];
  ranking_revelado: boolean;
  version_politica_privacidad: string;
  politica_privacidad_url: string;
  aviso_privacidad_corto: string;
  contacto_privacidad: string;
  whatsapp_contacto: { numero: string; mensaje: string } | null;
}

export interface HomepageData {
  destacados: EventoHomepage[];
  eventos: EventoHomepage[];
}

export async function getHomepageEventos(): Promise<HomepageData> {
  const { data } = await publicClient.get("/homepage/");
  return data;
}

export interface SiteConfigPublic {
  whatsapp_numero: string;
  whatsapp_mensaje: string;
}

export async function getSiteConfig(): Promise<SiteConfigPublic> {
  const { data } = await publicClient.get("/site-config/");
  return data;
}

export async function getEventoPortal(slug: string): Promise<EventoPortal> {
  const { data } = await publicClient.get(`/portal/${slug}/`);
  return data;
}

// ── Full Pass ────────────────────────────────────────────────────────────────

export interface PagoFullPassEstado {
  estado: "pendiente" | "aprobado" | "rechazado";
  nombre_completo?: string;
}

export async function getFullPassEstado(
  slug: string,
  cedula: string
): Promise<PagoFullPassEstado | null> {
  const { data } = await publicClient.get(`/portal/${slug}/full-pass/`, {
    params: { cedula },
  });
  return data;
}

export async function submitFullPass(
  slug: string,
  formData: FormData
): Promise<{ id: number; estado: string; cedula: string }> {
  const { data } = await publicClient.post(`/portal/${slug}/full-pass/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

// ── Categorías ───────────────────────────────────────────────────────────────

export interface InscripcionExistente {
  id: number;
  nombre_acto: string;
  ritmo: string;
  modalidad: string;
  categoria_ritmo_id: number;
  estado: "pendiente" | "aprobada" | "rechazada";
}

export interface CategoriasPortalResponse {
  full_pass_estado: "pendiente" | "aprobado" | "rechazado" | null;
  categorias: CategoriaRitmo[];
  inscripciones_existentes: InscripcionExistente[];
}

export async function getCategoriasPortal(
  slug: string,
  cedula: string
): Promise<CategoriasPortalResponse> {
  const { data } = await publicClient.get(`/portal/${slug}/categorias/`, {
    params: { cedula },
  });
  return data;
}

export interface RegistroCategoriaPayload {
  cedula: string;
  categoria_ritmo: number;
  nombre_acto?: string;
  academia?: string;
  foto_url?: string;
  pista_musical_url?: string;
  comprobante_categoria_url?: string;
  cedula_2?: string;
  cedulas?: string[];
  representante?: string;
  cedula_representante?: string;
  acepta_politica_privacidad: boolean;
  es_menor_edad?: boolean;
  acepta_como_representante_legal?: boolean;
  nombre_representante_legal?: string;
  cedula_representante_legal?: string;
}

export async function submitCategoriaPortal(
  slug: string,
  payload: RegistroCategoriaPayload
): Promise<{ id: number; estado: string }> {
  const { data } = await publicClient.post(`/portal/${slug}/categorias/`, payload);
  return data;
}

// ── Mi Agenda ────────────────────────────────────────────────────────────────

export interface AgendaItem {
  id: number;
  orden: number;
  titulo: string;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  ritmo: string | null;
  modalidad: string | null;
  nombre_acto: string | null;
}

export async function getMiAgenda(
  slug: string,
  cedula: string
): Promise<{ items: AgendaItem[] }> {
  const { data } = await publicClient.get(`/portal/${slug}/mi-agenda/`, {
    params: { cedula },
  });
  return data;
}

// ── Ranking portal ───────────────────────────────────────────────────────────

export interface RankingEntry {
  posicion: number;
  nombre_acto: string;
  puntaje_final: string;
}

export interface RankingCategoria {
  ritmo: string;
  modalidad: string;
  top3: RankingEntry[];
}

export async function getRankingPortal(
  slug: string,
  ritmo?: string,
  modalidad?: string
): Promise<{ publicado: boolean; categorias: RankingCategoria[] }> {
  const { data } = await publicClient.get(`/portal/${slug}/ranking/`, {
    params: { ritmo, modalidad },
  });
  return data;
}
