export interface CriterioEvaluacion {
  id: number;
  evento: number;
  nombre: string;
}

export interface JuezRecord {
  id: number;
  usuario: number;
  evento: number;
  usuario_email: string;
}

export interface CategoriaAsignada {
  id: number;
  nombre_ritmo: string;
  modalidad: string;
  total_inscripciones: number;
  inscripciones_calificadas: number;
}

export interface JuezAsignacion {
  juez_id: number;
  evento_id: number;
  evento_nombre: string;
  evento_fecha: string;
  evento_ubicacion: string;
  categorias: CategoriaAsignada[];
}

export interface Calificacion {
  id: number;
  juez: number;
  inscripcion: number;
  criterio: number;
  puntaje: string;
  comentario: string;
  bloqueada: boolean;
  feedback_audio_url: string;
}
