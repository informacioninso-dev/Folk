export interface OrganizadorDetalle {
  id: number;
  usuario: number | null;
  username: string | null;
  nombre: string;
  nit_ruc: string;
  email_contacto: string;
  max_eventos: number;
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
