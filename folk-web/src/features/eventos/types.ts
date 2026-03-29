export interface Organizador {
  id: number;
  nombre: string;
  nit_ruc: string;
  email_contacto: string;
}

export interface Evento {
  id: number;
  organizador: number;
  nombre: string;
  fecha: string;
  ubicacion: string;
  activo: boolean;
  slug: string;
  estado: string;
  banner_url: string | null;
  descripcion_portal: string;
  portal_activo: boolean;
  destacado: boolean;
  pago_folk_confirmado: boolean;
  monto_folk: string | null;
  notas_pago: string;
  permitir_multimodalidad: boolean;
  categorias_tienen_costo: boolean;
  mostrar_whatsapp: boolean;
  whatsapp_mensaje_evento: string;
  created_at: string;
}

export interface FullPassConfig {
  id: number;
  evento: number;
  nombre: string;
  precio: string;
  es_requerido: boolean;
}

export interface PagoFullPass {
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

export interface PagoCategoria {
  id: number;
  pago_full_pass: number;
  inscripcion: number | null;
  comprobante_imagen_url: string | null;
  numero_comprobante: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  nota_rechazo: string;
  created_at: string;
}

export interface BloqueHorario {
  id: number;
  evento: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
}

export interface OrdenRitmoAgenda {
  id: number;
  evento: number;
  ritmo: string;
  modalidad: string;
  orden: number;
}

export interface CategoriaRitmo {
  id: number;
  evento: number;
  nombre_ritmo: string;
  modalidad: "solista" | "pareja" | "grupo";
  edad_min: number | null;
  edad_max: number | null;
  precio_adicional: string;
  incluido_full_pass: boolean;
}

export interface Participante {
  id: number;
  nombre_completo: string;
  identificacion: string;
  edad: number;
}

export interface Inscripcion {
  id: number;
  categoria_ritmo: number;
  nombre_acto: string;
  academia: string;
  estado_pago: boolean;
  estado_inscripcion: "pendiente" | "aprobada" | "rechazada";
  nota_rechazo: string;
  foto_url: string;
  pista_musical_url: string;
  comprobante_categoria_url: string;
  puntaje_final: string;
  participantes: Participante[];
}

export interface ParticipanteGeneral {
  id: number;
  evento: number;
  nombre_completo: string;
  cedula: string;
  edad: number;
  correo_electronico: string;
  telefono: string;
  comprobante_pago_url: string;
  estado: "pendiente_validacion" | "activo" | "rechazado";
  nota_rechazo: string;
}

export interface ParticipanteUnificado {
  id: number;
  origen: "full_pass" | "registro_general";
  nombre_completo: string;
  cedula: string;
  correo_electronico: string;
  telefono: string;
  estado: string;
  comprobante_url: string;
  categorias: { id: number; nombre: string; estado: string }[];
  created_at: string;
}

export interface RankingInscripcion {
  posicion: number;
  id: number;
  nombre_acto: string;
  puntaje_final: string;
  participantes: Participante[];
  desglose: { criterio: string; puntaje: string }[];
}

export interface RankingCategoria {
  categoria_id: number;
  nombre_ritmo: string;
  modalidad: string;
  total?: number;
  inscripciones: RankingInscripcion[];
}
