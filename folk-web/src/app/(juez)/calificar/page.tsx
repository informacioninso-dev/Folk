"use client";

import Link from "next/link";
import { useMisAsignaciones } from "@/features/calificaciones/hooks";
import { useMe } from "@/features/auth/hooks";
import type { JuezAsignacion } from "@/features/calificaciones/types";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
      <div
        className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-orange-400"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function EventoCard({ asignacion }: { asignacion: JuezAsignacion }) {
  const totalInscripciones = asignacion.categorias.reduce((s, c) => s + c.total_inscripciones, 0);
  const calificadas        = asignacion.categorias.reduce((s, c) => s + c.inscripciones_calificadas, 0);
  const completo           = totalInscripciones > 0 && calificadas === totalInscripciones;

  const fecha = new Date(asignacion.evento_fecha + "T00:00:00").toLocaleDateString("es-EC", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <Link
      href={`/calificar/${asignacion.evento_id}`}
      className={`block bg-white rounded-2xl border p-5 shadow-sm active:scale-[0.98] transition-transform ${
        completo ? "border-emerald-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-base leading-snug">{asignacion.evento_nombre}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{fecha}</p>
          <p className="text-xs text-gray-400">{asignacion.evento_ubicacion}</p>
        </div>
        <div className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
          completo
            ? "bg-emerald-50 text-emerald-700"
            : "bg-orange-50 text-orange-600"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${completo ? "bg-emerald-500" : "bg-orange-400"}`} />
          {completo ? "Completo" : "Pendiente"}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{asignacion.categorias.length} {asignacion.categorias.length === 1 ? "categoría" : "categorías"}</span>
          <span className="font-semibold">{calificadas}/{totalInscripciones} calificados</span>
        </div>
        <ProgressBar value={calificadas} max={totalInscripciones} />
      </div>

      <div className="mt-3 flex items-center gap-1 text-orange-500 text-sm font-medium">
        <span>Ir a calificar</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

export default function CalificarPage() {
  const { data: asignaciones, isLoading } = useMisAsignaciones();
  const { data: me } = useMe();

  if (isLoading) {
    return (
      <div className="space-y-4 mt-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Saludo */}
      <div className="pt-1">
        <h1 className="text-xl font-extrabold text-gray-900">
          {me?.username ? `Hola, ${me.username}` : "Panel de juez"}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Tus eventos asignados</p>
      </div>

      {/* Lista de eventos */}
      {!asignaciones?.length ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm font-medium">Sin eventos asignados</p>
          <p className="text-xs mt-1">El organizador te asignará a los eventos próximamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {asignaciones.map((a) => (
            <EventoCard key={a.juez_id} asignacion={a} />
          ))}
        </div>
      )}
    </div>
  );
}
