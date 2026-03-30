import { apiClient } from "@/lib/api-client";
import type { OrganizadorDetalle, CrearClientePayload, SiteConfig, DashboardData, PagoFullPassSA, ActividadItem } from "./types";
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

  testSiteConfigEmail: (email: string) =>
    apiClient
      .post<{ detail: string }>("/site-config/test-email/", { email })
      .then((r) => r.data),

  getDashboard: () =>
    apiClient.get<DashboardData>("/superadmin/dashboard/").then((r) => r.data),

  updateNotasInternas: (organizadorId: number, notas_internas: string) =>
    apiClient
      .patch<OrganizadorDetalle>(`/organizadores/${organizadorId}/`, { notas_internas })
      .then((r) => r.data),

  getPagosFullPassDeEvento: (eventoId: number) =>
    apiClient
      .get<PagoFullPassSA[]>("/pagos-full-pass/", { params: { evento: eventoId } })
      .then((r) => r.data),

  actualizarEstadoPagoFP: (pagoId: number, data: { estado: string; nota_rechazo?: string }) =>
    apiClient
      .patch<PagoFullPassSA>(`/pagos-full-pass/${pagoId}/`, data)
      .then((r) => r.data),

  getActividadOrganizador: (organizadorId: number) =>
    apiClient
      .get<ActividadItem[]>(`/superadmin/organizadores/${organizadorId}/actividad/`)
      .then((r) => r.data),

  actualizarPlan: (organizadorId: number, data: { plan_nombre?: string; plan_fecha_venc?: string | null; plan_notas?: string; max_eventos?: number }) =>
    apiClient
      .patch<OrganizadorDetalle>(`/organizadores/${organizadorId}/`, data)
      .then((r) => r.data),

  enviarComunicado: (data: { asunto: string; mensaje: string; organizador_id?: number | null }) =>
    apiClient
      .post<{ enviados: number; destinatarios: string[] }>("/superadmin/comunicados/", data)
      .then((r) => r.data),
};
