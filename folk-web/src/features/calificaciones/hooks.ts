"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { criteriosApi, juecesApi, calificacionesApi } from "./api";

export function useCriterios(eventoId: number) {
  return useQuery({
    queryKey: ["criterios", { eventoId }] as const,
    queryFn: () => criteriosApi.list(eventoId),
    enabled: !!eventoId,
  });
}

export function useMisJueces() {
  return useQuery({
    queryKey: ["jueces", "mis"] as const,
    queryFn: juecesApi.misAsignaciones,
  });
}

export function useMisAsignaciones() {
  return useQuery({
    queryKey: ["jueces", "mis-asignaciones"] as const,
    queryFn: juecesApi.misAsignacionesDetalle,
  });
}

export function useCalificacionesJuezEvento(eventoId: number) {
  return useQuery({
    queryKey: ["calificaciones", { me: true, evento: eventoId }] as const,
    queryFn: () => calificacionesApi.list({ me: true, evento: eventoId }),
    enabled: !!eventoId,
  });
}

export function useCalificaciones(params: { inscripcion?: number; juez?: number }) {
  return useQuery({
    queryKey: ["calificaciones", params] as const,
    queryFn: () => calificacionesApi.list(params),
    enabled: !!(params.inscripcion || params.juez),
  });
}

export function useSaveCalificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      existing?: { id: number; bloqueada?: boolean };
      payload: { juez: number; inscripcion: number; criterio: number; puntaje: string; comentario: string };
    }) => {
      if (data.existing) {
        return calificacionesApi.update(data.existing.id, {
          puntaje: data.payload.puntaje,
          comentario: data.payload.comentario,
        });
      }
      return calificacionesApi.create(data.payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calificaciones"] });
    },
  });
}

export function useBloquearInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inscripcionId: number) =>
      calificacionesApi.bloquearInscripcion(inscripcionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calificaciones"] }),
  });
}

export function useUploadAudioCalificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) =>
      calificacionesApi.uploadAudio(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calificaciones"] }),
  });
}
