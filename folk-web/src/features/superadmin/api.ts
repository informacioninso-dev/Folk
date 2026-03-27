import { apiClient } from "@/lib/api-client";
import type { OrganizadorDetalle, CrearClientePayload, SiteConfig } from "./types";
import type { Evento } from "@/features/eventos/types";

export const superadminApi = {
  listarOrganizadores: () =>
    apiClient.get<OrganizadorDetalle[]>("/organizadores/").then((r) => r.data),

  getOrganizador: (id: number) =>
    apiClient.get<OrganizadorDetalle>(`/organizadores/${id}/`).then((r) => r.data),

  getEventosDeOrganizador: (organizadorId: number) =>
    apiClient
      .get<Evento[]>("/eventos/", { params: { organizador: organizadorId } })
      .then((r) => r.data),

  crearCliente: (data: CrearClientePayload) =>
    apiClient
      .post<OrganizadorDetalle>("/organizadores/crear-cliente/", data)
      .then((r) => r.data),

  eliminarOrganizador: (id: number) =>
    apiClient.delete(`/organizadores/${id}/`),

  resetPassword: (id: number) =>
    apiClient
      .post<{ username: string; password: string }>(`/organizadores/${id}/reset-password/`)
      .then((r) => r.data),

  setLimiteEventos: (organizadorId: number, max_eventos: number) =>
    apiClient
      .patch<{ id: number; max_eventos: number }>(`/organizadores/${organizadorId}/set-limite/`, { max_eventos })
      .then((r) => r.data),

  registrarPagoEvento: (eventoId: number, data: {
    pago_folk_confirmado?: boolean;
    monto_folk?: string;
    notas_pago?: string;
  }) =>
    apiClient
      .patch<{ id: number; pago_folk_confirmado: boolean; monto_folk: string | null; notas_pago: string }>(
        `/eventos/${eventoId}/pago-folk/`, data
      )
      .then((r) => r.data),

  getSiteConfig: () =>
    apiClient.get<SiteConfig>("/site-config/").then((r) => r.data),

  updateSiteConfig: (data: Partial<SiteConfig>) =>
    apiClient.patch<SiteConfig>("/site-config/", data).then((r) => r.data),
};
