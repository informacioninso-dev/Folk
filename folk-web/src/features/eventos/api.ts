import { apiClient } from "@/lib/api-client";
import type {
  BloqueHorario,
  CategoriaRitmo,
  Evento,
  FullPassConfig,
  Inscripcion,
  OrdenRitmoAgenda,
  PagoCategoria,
  PagoFullPass,
  ParticipanteGeneral,
  RankingCategoria,
} from "./types";

// ─── Eventos ──────────────────────────────────────────────────────────────────

export const eventosApi = {
  list: (organizadorId?: number) =>
    apiClient
      .get<Evento[]>("/eventos/", {
        params: organizadorId ? { organizador: organizadorId } : undefined,
      })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Evento>(`/eventos/${id}/`).then((r) => r.data),

  create: (
    data: Pick<Evento, "nombre" | "fecha" | "ubicacion" | "activo"> &
      Partial<Pick<Evento, "organizador">>
  ) =>
    apiClient.post<Evento>("/eventos/", data).then((r) => r.data),

  update: (id: number, data: Partial<Omit<Evento, "id" | "slug" | "created_at">>) =>
    apiClient.patch<Evento>(`/eventos/${id}/`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/eventos/${id}/`),

  ranking: (id: number) =>
    apiClient.get<RankingCategoria[]>(`/eventos/${id}/ranking/`).then((r) => r.data),
};

// ─── Categorías ───────────────────────────────────────────────────────────────

export const categoriasApi = {
  list: (eventoId: number) =>
    apiClient
      .get<CategoriaRitmo[]>("/categorias-ritmo/", { params: { evento: eventoId } })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient.get<CategoriaRitmo>(`/categorias-ritmo/${id}/`).then((r) => r.data),

  create: (data: { evento: number; nombre_ritmo: string; modalidad: string }) =>
    apiClient.post<CategoriaRitmo>("/categorias-ritmo/", data).then((r) => r.data),

  update: (id: number, data: Partial<Pick<CategoriaRitmo, "precio_adicional" | "incluido_full_pass">>) =>
    apiClient.patch<CategoriaRitmo>(`/categorias-ritmo/${id}/`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/categorias-ritmo/${id}/`),

  ranking: (id: number) =>
    apiClient.get<RankingCategoria>(`/categorias-ritmo/${id}/ranking/`).then((r) => r.data),
};

// ─── Inscripciones ────────────────────────────────────────────────────────────

export const inscripcionesApi = {
  list: (categoriaId: number) =>
    apiClient
      .get<Inscripcion[]>("/inscripciones/", { params: { categoria_ritmo: categoriaId } })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Inscripcion>(`/inscripciones/${id}/`).then((r) => r.data),

  patchPago: (id: number, estado_pago: boolean) =>
    apiClient.patch<Inscripcion>(`/inscripciones/${id}/`, { estado_pago }).then((r) => r.data),
};

// ─── Jueces ───────────────────────────────────────────────────────────────────

export interface JuezCategoriaDetalle {
  id: number;
  nombre_ritmo: string;
  modalidad: string;
}

export interface JuezItem {
  id: number;
  usuario: number;
  usuario_email: string;
  evento: number;
  categorias: number[];
  categorias_detalle: JuezCategoriaDetalle[];
}

export interface UsuarioResultado {
  id: number;
  username: string;
  email: string;
}

export const juecesApi = {
  list: (eventoId: number) =>
    apiClient
      .get<JuezItem[]>("/jueces/", { params: { evento: eventoId } })
      .then((r) => r.data),

  create: (data: { usuario: number; evento: number }) =>
    apiClient.post<JuezItem>("/jueces/", data).then((r) => r.data),

  update: (id: number, data: { categorias: number[] }) =>
    apiClient.patch<JuezItem>(`/jueces/${id}/`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/jueces/${id}/`),

  buscarUsuario: (username: string) =>
    apiClient
      .get<UsuarioResultado[]>("/usuarios/buscar/", { params: { username } })
      .then((r) => r.data),
};

// ─── Participantes Generales ──────────────────────────────────────────────────

export const participantesGeneralesApi = {
  list: (eventoId: number, estado?: string) =>
    apiClient
      .get<ParticipanteGeneral[]>("/participantes-generales/", {
        params: { evento: eventoId, ...(estado ? { estado } : {}) },
      })
      .then((r) => r.data),

  aprobar: (id: number) =>
    apiClient.post<ParticipanteGeneral>(`/participantes-generales/${id}/aprobar/`).then((r) => r.data),

  rechazar: (id: number, nota: string) =>
    apiClient
      .post<ParticipanteGeneral>(`/participantes-generales/${id}/rechazar/`, { nota })
      .then((r) => r.data),
};

export const inscripcionesValidacionApi = {
  aprobar: (id: number) =>
    apiClient.post<Inscripcion>(`/inscripciones/${id}/aprobar/`).then((r) => r.data),

  rechazar: (id: number, nota: string) =>
    apiClient
      .post<Inscripcion>(`/inscripciones/${id}/rechazar/`, { nota })
      .then((r) => r.data),
};

// ─── Criterios ────────────────────────────────────────────────────────────────

export interface CriterioItem {
  id: number;
  evento: number;
  nombre: string;
}

export const criteriosGestionApi = {
  list: (eventoId: number) =>
    apiClient
      .get<CriterioItem[]>("/criterios-evaluacion/", { params: { evento: eventoId } })
      .then((r) => r.data),

  create: (data: { evento: number; nombre: string }) =>
    apiClient.post<CriterioItem>("/criterios-evaluacion/", data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/criterios-evaluacion/${id}/`),
};

// ─── Ranking (gestión) ────────────────────────────────────────────────────────

export interface RankingRecord {
  id: number;
  evento: number;
  estado: "borrador" | "publicado";
  publicado_en: string | null;
}

export const rankingGestionApi = {
  getOrCreate: (eventoId: number) =>
    apiClient
      .post<RankingRecord>(`/eventos/${eventoId}/get-or-create-ranking/`)
      .then((r) => r.data),

  publicar: (rankingId: number) =>
    apiClient.post<RankingRecord>(`/rankings/${rankingId}/publicar/`).then((r) => r.data),
};

// ─── Cronograma ───────────────────────────────────────────────────────────────

export interface CronogramaRecord {
  id: number;
  evento: number;
}

export interface ItemCronogramaRecord {
  id: number;
  cronograma: number;
  inscripcion: number;
  inscripcion_nombre?: string;
  orden: number;
  duracion_segundos: number;
  tiempo_extra: number;
}

export const cronogramaApi = {
  getOrCreate: (eventoId: number) =>
    apiClient
      .post<CronogramaRecord>("/cronogramas/", { evento: eventoId })
      .then((r) => r.data)
      .catch(() =>
        apiClient
          .get<CronogramaRecord[]>("/cronogramas/", { params: { evento: eventoId } })
          .then((r) => r.data[0])
      ),

  getByEvento: (eventoId: number) =>
    apiClient
      .get<CronogramaRecord[]>("/cronogramas/")
      .then((r) => r.data.find((c) => c.evento === eventoId) ?? null),

  listItems: (cronogramaId: number) =>
    apiClient
      .get<ItemCronogramaRecord[]>("/items-cronograma/", { params: { cronograma: cronogramaId } })
      .then((r) => r.data),

  addItem: (data: { cronograma: number; inscripcion: number; orden: number; duracion_segundos: number }) =>
    apiClient.post<ItemCronogramaRecord>("/items-cronograma/", data).then((r) => r.data),

  deleteItem: (id: number) => apiClient.delete(`/items-cronograma/${id}/`),

  updateItem: (id: number, data: Partial<ItemCronogramaRecord>) =>
    apiClient.patch<ItemCronogramaRecord>(`/items-cronograma/${id}/`, data).then((r) => r.data),
};

export const cronogramaLiveApi = {
  get: (slug: string) =>
    apiClient.get<{
      evento: { id: number; nombre: string; slug: string };
      cronograma_id: number;
      items: ItemCronogramaRecord[];
    }>(`/cronograma-live/${slug}/`).then((r) => r.data),
};

// ─── Full Pass Config (admin) ──────────────────────────────────────────────────

export const fullPassConfigApi = {
  get: (eventoId: number) =>
    apiClient
      .get<FullPassConfig[]>("/full-pass-config/", { params: { evento: eventoId } })
      .then((r) => r.data[0] ?? null),

  create: (data: { evento: number; nombre: string; precio: string; es_requerido: boolean }) =>
    apiClient.post<FullPassConfig>("/full-pass-config/", data).then((r) => r.data),

  update: (id: number, data: Partial<FullPassConfig>) =>
    apiClient.patch<FullPassConfig>(`/full-pass-config/${id}/`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/full-pass-config/${id}/`),
};

// ─── Pagos Full Pass (admin) ───────────────────────────────────────────────────

export const pagosFullPassApi = {
  list: (eventoId: number, estado?: string) =>
    apiClient
      .get<PagoFullPass[]>("/pagos-full-pass/", {
        params: { evento: eventoId, ...(estado ? { estado } : {}) },
      })
      .then((r) => r.data),

  aprobar: (id: number) =>
    apiClient.post<PagoFullPass>(`/pagos-full-pass/${id}/aprobar/`).then((r) => r.data),

  rechazar: (id: number, nota: string) =>
    apiClient.post<PagoFullPass>(`/pagos-full-pass/${id}/rechazar/`, { nota }).then((r) => r.data),
};

// ─── Pagos Categoría (admin) ───────────────────────────────────────────────────

export const pagosCategoriaApi = {
  list: (eventoId: number, estado?: string) =>
    apiClient
      .get<PagoCategoria[]>("/pagos-categoria/", {
        params: { evento: eventoId, ...(estado ? { estado } : {}) },
      })
      .then((r) => r.data),

  aprobar: (id: number) =>
    apiClient.post<PagoCategoria>(`/pagos-categoria/${id}/aprobar/`).then((r) => r.data),

  rechazar: (id: number, nota: string) =>
    apiClient.post<PagoCategoria>(`/pagos-categoria/${id}/rechazar/`, { nota }).then((r) => r.data),
};

// ─── Bloques Horario (admin) ───────────────────────────────────────────────────

export const bloquesHorarioApi = {
  list: (eventoId: number) =>
    apiClient
      .get<BloqueHorario[]>("/bloques-horario/", { params: { evento: eventoId } })
      .then((r) => r.data),

  create: (data: Omit<BloqueHorario, "id">) =>
    apiClient.post<BloqueHorario>("/bloques-horario/", data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/bloques-horario/${id}/`),
};

// ─── Orden Ritmo Agenda (admin) ────────────────────────────────────────────────

export const ordenRitmoAgendaApi = {
  list: (eventoId: number) =>
    apiClient
      .get<OrdenRitmoAgenda[]>("/ordenes-ritmo-agenda/", { params: { evento: eventoId } })
      .then((r) => r.data),

  create: (data: Omit<OrdenRitmoAgenda, "id">) =>
    apiClient.post<OrdenRitmoAgenda>("/ordenes-ritmo-agenda/", data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/ordenes-ritmo-agenda/${id}/`),
};

// ─── Estadísticas del evento ───────────────────────────────────────────────────

export interface EventoEstadisticas {
  full_pass: {
    total: number;
    aprobados: number;
    pendientes: number;
    rechazados: number;
    ingreso_esperado: number;
  };
  categorias: {
    ritmo: string;
    modalidad: string;
    precio_adicional: number;
    total: number;
    aprobadas: number;
  }[];
}

export const estadisticasApi = {
  get: (eventoId: number) =>
    apiClient.get<EventoEstadisticas>(`/eventos/${eventoId}/estadisticas/`).then((r) => r.data),
};

// ─── Generador de agenda ───────────────────────────────────────────────────────

export const agendaGeneradorApi = {
  generar: (
    eventoId: number,
    modo: "horarios" | "orden_ritmo" | "manual",
    extra?: Record<string, unknown>
  ) =>
    apiClient
      .post(`/eventos/${eventoId}/generar-agenda/`, { modo, ...extra })
      .then((r) => r.data),
};
