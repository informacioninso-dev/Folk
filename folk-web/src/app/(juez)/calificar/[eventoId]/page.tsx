"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMisAsignaciones } from "@/features/calificaciones/hooks";
import type { CategoriaAsignada } from "@/features/calificaciones/types";

const MODALIDAD_LABEL: Record<string, string> = {
  solista: "Solista",
  pareja:  "Pareja",
  grupo:   "Grupo",
};

const MODALIDAD_ICON: Record<string, string> = {
  solista: "👤",
  pareja:  "👫",
  grupo:   "👥",
};

function CategoriaCard({
  cat,
  eventoId,
  juezId,
}: {
  cat: CategoriaAsignada;
  eventoId: number;
  juezId: number;
}) {
  const completo = cat.total_inscripciones > 0 && cat.inscripciones_calificadas === cat.total_inscripciones;
  const pct = cat.total_inscripciones === 0
    ? 0
    : Math.round((cat.inscripciones_calificadas / cat.total_inscripciones) * 100);

  return (
    <Link
      href={`/calificar/${eventoId}/${cat.id}?juez=${juezId}`}
      className={`block bg-white rounded-2xl border p-5 shadow-sm active:scale-[0.98] transition-transform ${
        completo ? "border-emerald-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
            completo ? "bg-emerald-50" : "bg-orange-50"
          }`}>
            {MODALIDAD_ICON[cat.modalidad] ?? "🎭"}
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-snug">{cat.nombre_ritmo}</p>
            <p className="text-sm text-gray-400">{MODALIDAD_LABEL[cat.modalidad] ?? cat.modalidad}</p>
          </div>
        </div>

        <div className={`shrink-0 text-right`}>
          <p className={`text-lg font-extrabold ${completo ? "text-emerald-600" : "text-orange-500"}`}>
            {cat.inscripciones_calificadas}
            <span className="text-sm font-medium text-gray-300">/{cat.total_inscripciones}</span>
          </p>
          <p className="text-xs text-gray-400">calificados</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="mt-4">
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${completo ? "bg-emerald-500" : "bg-orange-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-gray-400">{pct}% completado</span>
          <span className={`text-xs font-semibold ${completo ? "text-emerald-600" : "text-orange-500"}`}>
            {completo ? "✓ Listo" : "En progreso →"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function EventoCategorias() {
  const { eventoId } = useParams<{ eventoId: string }>();
  const id = Number(eventoId);
  const { data: asignaciones, isLoading } = useMisAsignaciones();

  const asignacion = asignaciones?.find((a) => a.evento_id === id);

  if (isLoading) {
    return (
      <div className="space-y-4 mt-2">
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse w-2/3" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!asignacion) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Evento no encontrado o sin categorías asignadas.</p>
        <Link href="/calificar" className="text-orange-500 text-sm font-medium mt-3 inline-block">← Volver</Link>
      </div>
    );
  }

  const fecha = new Date(asignacion.evento_fecha + "T00:00:00").toLocaleDateString("es-EC", {
    day: "numeric", month: "long",
  });

  return (
    <div className="space-y-5">
      {/* Header con back */}
      <div>
        <Link href="/calificar" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-500 transition mb-3 font-medium active:text-orange-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Mis eventos
        </Link>
        <h1 className="text-xl font-extrabold text-gray-900 leading-snug">{asignacion.evento_nombre}</h1>
        <p className="text-sm text-gray-400 mt-0.5">{fecha} · {asignacion.evento_ubicacion}</p>
      </div>

      {/* Categorías */}
      {asignacion.categorias.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <p>No tienes categorías asignadas en este evento.</p>
          <p className="text-xs mt-1">Pide al organizador que te asigne categorías.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            {asignacion.categorias.length} {asignacion.categorias.length === 1 ? "categoría asignada" : "categorías asignadas"}
          </p>
          {asignacion.categorias.map((cat) => (
            <CategoriaCard
              key={cat.id}
              cat={cat}
              eventoId={id}
              juezId={asignacion.juez_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
