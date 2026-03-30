"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superadminApi } from "./api";
import type { CrearClientePayload } from "./types";

const KEYS = {
  organizadores: ["sa", "organizadores"] as const,
};

export function useOrganizadores() {
  return useQuery({
    queryKey: KEYS.organizadores,
    queryFn: superadminApi.listarOrganizadores,
  });
}

export function useOrganizador(id: number) {
  return useQuery({
    queryKey: ["sa", "organizadores", id] as const,
    queryFn: () => superadminApi.getOrganizador(id),
    enabled: !!id,
  });
}

export function useEventosDeOrganizador(organizadorId: number) {
  return useQuery({
    queryKey: ["sa", "eventos", { organizadorId }] as const,
    queryFn: () => superadminApi.getEventosDeOrganizador(organizadorId),
    enabled: !!organizadorId,
  });
}

export function useCrearCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CrearClientePayload) => superadminApi.crearCliente(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.organizadores }),
  });
}

export function useEliminarOrganizador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => superadminApi.eliminarOrganizador(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.organizadores }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (id: number) => superadminApi.resetPassword(id),
  });
}

export function useSetLimiteEventos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ organizadorId, max_eventos }: { organizadorId: number; max_eventos: number }) =>
      superadminApi.setLimiteEventos(organizadorId, max_eventos),
    onSuccess: (_data, { organizadorId }) => {
      qc.invalidateQueries({ queryKey: ["sa", "organizadores", organizadorId] });
      qc.invalidateQueries({ queryKey: KEYS.organizadores });
    },
  });
}

export function useSiteConfig() {
  return useQuery({
    queryKey: ["sa", "site-config"] as const,
    queryFn: superadminApi.getSiteConfig,
  });
}

export function useUpdateSiteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<import("./types").SiteConfig>) => superadminApi.updateSiteConfig(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "site-config"] }),
  });
}

export function useTestSiteConfigEmail() {
  return useMutation({
    mutationFn: (email: string) => superadminApi.testSiteConfigEmail(email),
  });
}

export function useEnviarComunicado() {
  return useMutation({
    mutationFn: (data: { asunto: string; mensaje: string; organizador_id?: number | null }) =>
      superadminApi.enviarComunicado(data),
  });
}

export function useActualizarPlan(organizadorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { plan_nombre?: string; plan_fecha_venc?: string | null; plan_notas?: string; max_eventos?: number }) =>
      superadminApi.actualizarPlan(organizadorId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa", "organizadores", organizadorId] });
      qc.invalidateQueries({ queryKey: ["sa", "organizadores"] });
    },
  });
}

export function useActividadOrganizador(organizadorId: number) {
  return useQuery({
    queryKey: ["sa", "actividad", organizadorId] as const,
    queryFn: () => superadminApi.getActividadOrganizador(organizadorId),
    refetchInterval: 30_000,
  });
}

export function useSuperadminDashboard() {
  return useQuery({
    queryKey: ["sa", "dashboard"] as const,
    queryFn: superadminApi.getDashboard,
    refetchInterval: 60_000, // auto-refresh each minute
  });
}

export function useUpdateNotasInternas(organizadorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (notas: string) => superadminApi.updateNotasInternas(organizadorId, notas),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sa", "organizadores", organizadorId] });
      qc.invalidateQueries({ queryKey: ["sa", "organizadores"] });
    },
  });
}

export function usePagosFullPassDeEvento(eventoId: number | null) {
  return useQuery({
    queryKey: ["sa", "pagos-fp", eventoId] as const,
    queryFn: () => superadminApi.getPagosFullPassDeEvento(eventoId!),
    enabled: eventoId !== null,
  });
}

export function useActualizarEstadoPagoFP(eventoId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pagoId, data }: { pagoId: number; data: { estado: string; nota_rechazo?: string } }) =>
      superadminApi.actualizarEstadoPagoFP(pagoId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "pagos-fp", eventoId] }),
  });
}

export function useRegistrarPagoEvento(organizadorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventoId, data }: {
      eventoId: number;
      data: { pago_folk_confirmado?: boolean; monto_folk?: string; notas_pago?: string };
    }) => superadminApi.registrarPagoEvento(eventoId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "eventos", { organizadorId }] }),
  });
}
