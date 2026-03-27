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
}

export interface CrearClientePayload {
  nombre: string;
  nit_ruc: string;
  email_contacto: string;
  username: string;
  password: string;
}
