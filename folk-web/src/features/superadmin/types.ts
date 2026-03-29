export interface OrganizadorDetalle {
  id: number;
  usuario: number | null;
  username: string | null;
  nombre: string;
  nit_ruc: string;
  email_contacto: string;
  notas_internas: string;
  max_eventos: number;
  plan_nombre: string;
  plan_fecha_venc: string | null;
  plan_notas: string;
  created_at: string;
}

export interface DashboardEvento {
  id: number;
  nombre: string;
  fecha: string;
  es_hoy: boolean;
  ubicacion: string;
  organizador_id: number;
  organizador_nombre: string;
  portal_activo: boolean;
  pago_folk_confirmado: boolean;
  inscripciones_total: number;
  full_pass_pendientes: number;
  full_pass_aprobados: number;
  categorias_count: number;
  advertencias: string[];
}

export interface DashboardStats {
  total_eventos: number;
  portales_activos: number;
  total_inscripciones: number;
  full_pass_aprobados: number;
  total_clientes: number;
  total_cobrado: string;
}

export interface DashboardData {
  eventos: DashboardEvento[];
  estadisticas: DashboardStats;
}

export interface ActividadItem {
  tipo: string;
  descripcion: string;
  estado: string;
  fecha: string;
}

export interface PagoFullPassSA {
  id: number;
  evento: number;
  cedula: string;
  nombre_completo: string;
  correo_electronico: string;
  telefono: string;
  comprobante_imagen_url: string | null;
  numero_comprobante: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  nota_rechazo: string;
  created_at: string;
}

export interface SiteConfig {
  whatsapp_numero: string;
  whatsapp_mensaje: string;
  politica_privacidad_version: string;
  politica_privacidad_url: string;
  aviso_privacidad_corto: string;
  email_host: string;
  email_port: number;
  email_use_tls: boolean;
  email_host_user: string;
  /** Write-only: not returned by the API */
  email_host_password?: string;
  email_from: string;
}

export interface CrearClientePayload {
  nombre: string;
  nit_ruc: string;
  email_contacto: string;
  username: string;
  password: string;
}
