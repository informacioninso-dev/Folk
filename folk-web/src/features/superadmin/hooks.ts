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
