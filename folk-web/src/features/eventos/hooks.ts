"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  eventosApi,
  categoriasApi,
  inscripcionesApi,
  juecesApi,
  criteriosGestionApi,
  participantesGeneralesApi,
  inscripcionesValidacionApi,
  rankingGestionApi,
  cronogramaApi,
} from "./api";
import type { Evento } from "./types";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const eventoKeys = {
  all: ["eventos"] as const,
  list: (organizadorId?: number) => [...eventoKeys.all, { organizadorId }] as const,
  detail: (id: number) => [...eventoKeys.all, id] as const,
  ranking: (id: number) => [...eventoKeys.all, id, "ranking"] as const,
};

export const categoriaKeys = {
  all: ["categorias"] as const,
  list: (eventoId: number) => [...categoriaKeys.all, { eventoId }] as const,
  ranking: (id: number) => [...categoriaKeys.all, id, "ranking"] as const,
};

// ─── Eventos ──────────────────────────────────────────────────────────────────

export function useEventos(organizadorId?: number) {
  return useQuery({
    queryKey: eventoKeys.list(organizadorId),
    queryFn: () => eventosApi.list(organizadorId),
  });
}

export function useEvento(id: number) {
  return useQuery({
    queryKey: eventoKeys.detail(id),
    queryFn: () => eventosApi.get(id),
    enabled: !!id,
  });
}

export function useEventoRanking(id: number) {
  return useQuery({
    queryKey: eventoKeys.ranking(id),
    queryFn: () => eventosApi.ranking(id),
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

export function useCrearEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<Evento, "organizador" | "nombre" | "fecha" | "ubicacion" | "activo">) =>
      eventosApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventoKeys.all }),
  });
}

export function useActualizarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Evento, "id" | "slug" | "created_at">> }) =>
      eventosApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: eventoKeys.all });
      qc.invalidateQueries({ queryKey: eventoKeys.detail(id) });
    },
  });
}

// ─── Categorías ───────────────────────────────────────────────────────────────

export function useCategorias(eventoId: number) {
  return useQuery({
    queryKey: categoriaKeys.list(eventoId),
    queryFn: () => categoriasApi.list(eventoId),
    enabled: !!eventoId,
  });
}

export function useCategoria(id: number) {
  return useQuery({
    queryKey: [...categoriaKeys.all, id] as const,
    queryFn: () => categoriasApi.get(id),
    enabled: !!id,
  });
}

export function useCrearCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { evento: number; nombre_ritmo: string; modalidad: string }) =>
      categoriasApi.create(data),
    onSuccess: (_, { evento }) =>
      qc.invalidateQueries({ queryKey: categoriaKeys.list(evento) }),
  });
}

export function useEliminarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; eventoId: number }) => categoriasApi.delete(id),
    onSuccess: (_, { eventoId }) =>
      qc.invalidateQueries({ queryKey: categoriaKeys.list(eventoId) }),
  });
}

export function useActualizarCategoria(eventoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof categoriasApi.update>[1] }) =>
      categoriasApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoriaKeys.list(eventoId) }),
  });
}

export function useCategoriaRanking(id: number) {
  return useQuery({
    queryKey: categoriaKeys.ranking(id),
    queryFn: () => categoriasApi.ranking(id),
    enabled: !!id,
    refetchInterval: 15_000,
  });
}

// ─── Inscripciones ────────────────────────────────────────────────────────────

export function useInscripciones(categoriaId: number) {
  return useQuery({
    queryKey: ["inscripciones", { categoriaId }],
    queryFn: () => inscripcionesApi.list(categoriaId),
    enabled: !!categoriaId,
  });
}

export function useInscripcion(id: number) {
  return useQuery({
    queryKey: ["inscripciones", id] as const,
    queryFn: () => inscripcionesApi.get(id),
    enabled: !!id,
  });
}

export function useTogglePago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado_pago }: { id: number; estado_pago: boolean; categoriaId: number }) =>
      inscripcionesApi.patchPago(id, estado_pago),
    onSuccess: (_, { categoriaId }) =>
      qc.invalidateQueries({ queryKey: ["inscripciones", { categoriaId }] }),
  });
}

// ─── Jueces ───────────────────────────────────────────────────────────────────

export function useJuecesEvento(eventoId: number) {
  return useQuery({
    queryKey: ["jueces", { eventoId }] as const,
    queryFn: () => juecesApi.list(eventoId),
    enabled: !!eventoId,
  });
}

export function useAgregarJuez() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { usuario: number; evento: number }) => juecesApi.create(data),
    onSuccess: (_, { evento }) =>
      qc.invalidateQueries({ queryKey: ["jueces", { eventoId: evento }] }),
  });
}

export function useEliminarJuez() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; eventoId: number }) => juecesApi.delete(id),
    onSuccess: (_, { eventoId }) =>
      qc.invalidateQueries({ queryKey: ["jueces", { eventoId }] }),
  });
}

export function useSetJuezCategorias(eventoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ juezId, categorias }: { juezId: number; categorias: number[] }) =>
      juecesApi.update(juezId, { categorias }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["jueces", { eventoId }] }),
  });
}

export function useBuscarUsuario(username: string) {
  return useQuery({
    queryKey: ["usuarios", "buscar", username] as const,
    queryFn: () => juecesApi.buscarUsuario(username),
    enabled: username.length >= 2,
    staleTime: 10_000,
  });
}

// ─── Participantes Generales ──────────────────────────────────────────────────

export function useParticipantesGenerales(eventoId: number, estado?: string) {
  return useQuery({
    queryKey: ["participantes-generales", { eventoId, estado }] as const,
    queryFn: () => participantesGeneralesApi.list(eventoId, estado),
    enabled: !!eventoId,
  });
}

export function useAprobarParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; eventoId: number }) =>
      participantesGeneralesApi.aprobar(id),
    onSuccess: (_, { eventoId }) =>
      qc.invalidateQueries({ queryKey: ["participantes-generales", { eventoId }] }),
  });
}

export function useRechazarParticipante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nota }: { id: number; nota: string; eventoId: number }) =>
      participantesGeneralesApi.rechazar(id, nota),
    onSuccess: (_, { eventoId }) =>
      qc.invalidateQueries({ queryKey: ["participantes-generales", { eventoId }] }),
  });
}

export function useAprobarInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; categoriaId: number }) =>
      inscripcionesValidacionApi.aprobar(id),
    onSuccess: (_, { categoriaId }) =>
      qc.invalidateQueries({ queryKey: ["inscripciones", { categoriaId }] }),
  });
}

export function useRechazarInscripcion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, nota }: { id: number; nota: string; categoriaId: number }) =>
      inscripcionesValidacionApi.rechazar(id, nota),
    onSuccess: (_, { categoriaId }) =>
      qc.invalidateQueries({ queryKey: ["inscripciones", { categoriaId }] }),
  });
}

// ─── Criterios ────────────────────────────────────────────────────────────────

export function useCriteriosEvento(eventoId: number) {
  return useQuery({
    queryKey: ["criterios", { eventoId }] as const,
    queryFn: () => criteriosGestionApi.list(eventoId),
    enabled: !!eventoId,
  });
}

export function useCrearCriterio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { evento: number; nombre: string }) =>
      criteriosGestionApi.create(data),
    onSuccess: (_, { evento }) =>
      qc.invalidateQueries({ queryKey: ["criterios", { eventoId: evento }] }),
  });
}

export function useEliminarCriterio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; eventoId: number }) =>
      criteriosGestionApi.delete(id),
    onSuccess: (_, { eventoId }) =>
      qc.invalidateQueries({ queryKey: ["criterios", { eventoId }] }),
  });
}

// ─── Ranking gestión ──────────────────────────────────────────────────────────

export function useGetOrCreateRanking(eventoId: number) {
  return useQuery({
    queryKey: ["ranking-gestion", eventoId] as const,
    queryFn: () => rankingGestionApi.getOrCreate(eventoId),
    enabled: !!eventoId,
  });
}

export function usePublicarRanking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rankingId }: { rankingId: number; eventoId: number }) =>
      rankingGestionApi.publicar(rankingId),
    onSuccess: (_, { eventoId }) =>
      qc.invalidateQueries({ queryKey: ["ranking-gestion", eventoId] }),
  });
}

// ─── Cronograma ───────────────────────────────────────────────────────────────

export function useCronogramaEvento(eventoId: number) {
  return useQuery({
    queryKey: ["cronograma", eventoId] as const,
    queryFn: () => cronogramaApi.getByEvento(eventoId),
    enabled: !!eventoId,
  });
}

export function useItemsCronograma(cronogramaId: number | undefined) {
  return useQuery({
    queryKey: ["cronograma-items", cronogramaId] as const,
    queryFn: () => cronogramaApi.listItems(cronogramaId!),
    enabled: !!cronogramaId,
  });
}

export function useAgregarItemCronograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { cronograma: number; inscripcion: number; orden: number; duracion_segundos: number }) =>
      cronogramaApi.addItem(data),
    onSuccess: (_, { cronograma }) =>
      qc.invalidateQueries({ queryKey: ["cronograma-items", cronograma] }),
  });
}

export function useEliminarItemCronograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cronogramaId: _cid }: { id: number; cronogramaId: number }) =>
      cronogramaApi.deleteItem(id),
    onSuccess: (_, { cronogramaId }) =>
      qc.invalidateQueries({ queryKey: ["cronograma-items", cronogramaId] }),
  });
}

export function useCrearCronograma() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventoId: number) => cronogramaApi.getOrCreate(eventoId),
    onSuccess: (_, eventoId) =>
      qc.invalidateQueries({ queryKey: ["cronograma", eventoId] }),
  });
}
