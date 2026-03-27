import { apiClient } from "@/lib/api-client";
import type { CriterioEvaluacion, JuezRecord, JuezAsignacion, Calificacion } from "./types";

export const criteriosApi = {
  list: (eventoId: number) =>
    apiClient
      .get<CriterioEvaluacion[]>("/criterios-evaluacion/", { params: { evento: eventoId } })
      .then((r) => r.data),
};

export const juecesApi = {
  misAsignaciones: () =>
    apiClient
      .get<JuezRecord[]>("/jueces/", { params: { mi_usuario: "true" } })
      .then((r) => r.data),

  misAsignacionesDetalle: () =>
    apiClient
      .get<JuezAsignacion[]>("/jueces/mis-asignaciones/")
      .then((r) => r.data),
};

export const calificacionesApi = {
  list: (params: { inscripcion?: number; juez?: number; evento?: number; me?: boolean }) =>
    apiClient
      .get<Calificacion[]>("/calificaciones/", {
        params: { ...params, me: params.me ? "true" : undefined },
      })
      .then((r) => r.data),

  create: (data: Omit<Calificacion, "id" | "bloqueada" | "feedback_audio_url">) =>
    apiClient.post<Calificacion>("/calificaciones/", data).then((r) => r.data),

  update: (id: number, data: Partial<Omit<Calificacion, "id" | "bloqueada" | "feedback_audio_url">>) =>
    apiClient.patch<Calificacion>(`/calificaciones/${id}/`, data).then((r) => r.data),

  bloquear: (id: number) =>
    apiClient.post<Calificacion>(`/calificaciones/${id}/bloquear/`).then((r) => r.data),

  bloquearInscripcion: (inscripcionId: number) =>
    apiClient
      .post<{ bloqueadas: number }>("/calificaciones/bloquear-inscripcion/", { inscripcion: inscripcionId })
      .then((r) => r.data),

  uploadAudio: (id: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient
      .post<Calificacion>(`/calificaciones/${id}/audio/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
};
