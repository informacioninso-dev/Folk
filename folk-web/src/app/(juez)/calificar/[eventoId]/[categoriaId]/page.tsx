"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useInscripciones } from "@/features/eventos/hooks";
import { useCriterios, useCalificacionesJuezEvento, useSaveCalificacion } from "@/features/calificaciones/hooks";
import type { Inscripcion } from "@/features/eventos/types";
import type { CriterioEvaluacion, Calificacion } from "@/features/calificaciones/types";

// ─── Stepper de puntaje ───────────────────────────────────────────────────────

function ScoreStepper({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const dec = () => onChange(Math.max(0, parseFloat((value - 0.5).toFixed(1))));
  const inc = () => onChange(Math.min(10, parseFloat((value + 0.5).toFixed(1))));

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={dec}
        disabled={disabled || value <= 0}
        className="w-12 h-12 rounded-xl bg-gray-100 active:bg-gray-200 disabled:opacity-30 flex items-center justify-center touch-manipulation transition-colors"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>

      <div className="flex-1 text-center">
        <span className={`text-4xl font-extrabold tabular-nums ${
          value >= 9 ? "text-emerald-500" : value >= 7 ? "text-orange-500" : value >= 5 ? "text-amber-500" : "text-red-400"
        }`}>
          {value.toFixed(1)}
        </span>
        <p className="text-xs text-gray-400 mt-0.5">/ 10.0</p>
      </div>

      <button
        onClick={inc}
        disabled={disabled || value >= 10}
        className="w-12 h-12 rounded-xl bg-orange-50 active:bg-orange-100 disabled:opacity-30 flex items-center justify-center touch-manipulation transition-colors"
      >
        <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

// ─── Formulario de calificación por inscripción ────────────────────────────────

function CalificacionForm({
  inscripcion,
  criterios,
  calificacionesExistentes,
  juezId,
  onGuardado,
}: {
  inscripcion: Inscripcion;
  criterios: CriterioEvaluacion[];
  calificacionesExistentes: Calificacion[];
  juezId: number;
  onGuardado: () => void;
}) {
  const saveMutation = useSaveCalificacion();

  // Inicializar estado con los valores existentes o 5.0 por defecto
  const [scores, setScores] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (const c of criterios) {
      const existing = calificacionesExistentes.find(
        (cal) => cal.criterio === c.id && cal.inscripcion === inscripcion.id
      );
      init[c.id] = existing ? parseFloat(existing.puntaje) : 5.0;
    }
    return init;
  });

  const [comentario, setComentario] = useState(() => {
    const first = calificacionesExistentes.find((cal) => cal.inscripcion === inscripcion.id);
    return first?.comentario ?? "";
  });

  const [guardado, setGuardado] = useState(false);

  // Reinicializar si cambia inscripción
  useEffect(() => {
    const init: Record<number, number> = {};
    for (const c of criterios) {
      const existing = calificacionesExistentes.find(
        (cal) => cal.criterio === c.id && cal.inscripcion === inscripcion.id
      );
      init[c.id] = existing ? parseFloat(existing.puntaje) : 5.0;
    }
    setScores(init);
    const first = calificacionesExistentes.find((cal) => cal.inscripcion === inscripcion.id);
    setComentario(first?.comentario ?? "");
    setGuardado(false);
  }, [inscripcion.id, criterios, calificacionesExistentes]);

  const handleGuardar = useCallback(async () => {
    if (saveMutation.isPending) return;

    for (const criterio of criterios) {
      const existing = calificacionesExistentes.find(
        (cal) => cal.criterio === criterio.id && cal.inscripcion === inscripcion.id
      );
      await saveMutation.mutateAsync({
        existing: existing ? { id: existing.id, bloqueada: existing.bloqueada } : undefined,
        payload: {
          juez: juezId,
          inscripcion: inscripcion.id,
          criterio: criterio.id,
          puntaje: scores[criterio.id].toFixed(1),
          comentario: comentario,
        },
      });
    }

    setGuardado(true);
    setTimeout(() => {
      onGuardado();
    }, 600);
  }, [criterios, calificacionesExistentes, inscripcion.id, scores, comentario, juezId, saveMutation, onGuardado]);

  const promedio = criterios.length > 0
    ? (Object.values(scores).reduce((s, v) => s + v, 0) / criterios.length).toFixed(2)
    : "—";

  return (
    <div className="space-y-4">
      {/* Criterios */}
      {criterios.map((criterio) => (
        <div key={criterio.id} className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-gray-700 mb-3">{criterio.nombre}</p>
          <ScoreStepper
            value={scores[criterio.id] ?? 5.0}
            onChange={(v) => setScores((prev) => ({ ...prev, [criterio.id]: v }))}
            disabled={saveMutation.isPending}
          />
        </div>
      ))}

      {/* Comentario */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-gray-700 mb-2">Comentario (opcional)</p>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={2}
          placeholder="Observaciones para el participante…"
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
        />
      </div>

      {/* Promedio + botón */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Promedio</p>
          <p className="text-2xl font-extrabold text-orange-500">{promedio}</p>
        </div>
        <button
          onClick={handleGuardar}
          disabled={saveMutation.isPending || guardado}
          className={`h-12 px-6 rounded-xl font-bold text-sm transition-all touch-manipulation ${
            guardado
              ? "bg-emerald-500 text-white"
              : "bg-orange-500 active:bg-orange-600 text-white disabled:opacity-50"
          }`}
        >
          {guardado ? "✓ Guardado" : saveMutation.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>

      {saveMutation.isError && (
        <p className="text-xs text-red-500 text-center">Error al guardar. Intenta de nuevo.</p>
      )}
    </div>
  );
}

// ─── Vista de lista de inscripciones ──────────────────────────────────────────

function InscripcionRow({
  inscripcion,
  calificaciones,
  criterios,
  isSelected,
  onSelect,
}: {
  inscripcion: Inscripcion;
  calificaciones: Calificacion[];
  criterios: CriterioEvaluacion[];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const cals = calificaciones.filter((c) => c.inscripcion === inscripcion.id);
  const calificada = cals.length >= criterios.length && criterios.length > 0;
  const promedio = cals.length > 0
    ? (cals.reduce((s, c) => s + parseFloat(c.puntaje), 0) / cals.length).toFixed(1)
    : null;

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      isSelected ? "border-orange-300 shadow-md shadow-orange-50" : "border-gray-200"
    }`}>
      <button
        onClick={onSelect}
        className="w-full text-left px-4 py-4 flex items-center gap-3 active:bg-gray-50 touch-manipulation"
      >
        {/* Status dot */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          calificada ? "bg-emerald-50" : "bg-orange-50"
        }`}>
          {calificada ? (
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{inscripcion.nombre_acto}</p>
          {inscripcion.academia && (
            <p className="text-xs text-gray-400 truncate">{inscripcion.academia}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          {promedio ? (
            <span className="text-lg font-extrabold text-orange-500">{promedio}</span>
          ) : (
            <span className="text-xs text-gray-300 font-medium">Sin puntaje</span>
          )}
          <svg
            className={`w-4 h-4 text-gray-300 mt-0.5 mx-auto transition-transform ${isSelected ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function CalificarCategoriaPage() {
  const { eventoId, categoriaId } = useParams<{ eventoId: string; categoriaId: string }>();
  const searchParams = useSearchParams();
  const juezId = Number(searchParams.get("juez"));
  const evId   = Number(eventoId);
  const catId  = Number(categoriaId);

  const { data: inscripciones, isLoading: loadingInsc } = useInscripciones(catId);
  const { data: criterios     = [], isLoading: loadingCrit } = useCriterios(evId);
  const { data: calificaciones = [], isLoading: loadingCal, refetch: refetchCals } =
    useCalificacionesJuezEvento(evId);

  const [seleccionada, setSeleccionada] = useState<number | null>(null);

  const calificadas = (inscripciones ?? []).filter((insc) => {
    const cals = calificaciones.filter((c) => c.inscripcion === insc.id);
    return cals.length >= criterios.length && criterios.length > 0;
  }).length;

  const isLoading = loadingInsc || loadingCrit || loadingCal;

  if (isLoading) {
    return (
      <div className="space-y-4 mt-2">
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  const selectedInsc = inscripciones?.find((i) => i.id === seleccionada);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Link
          href={`/calificar/${evId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-500 transition mb-3 font-medium active:text-orange-600"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Categorías
        </Link>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-gray-900">Calificaciones</h1>
          </div>
          <div className="bg-orange-50 text-orange-600 text-xs font-bold px-3 py-1.5 rounded-full shrink-0">
            {calificadas}/{inscripciones?.length ?? 0} listos
          </div>
        </div>
      </div>

      {/* Sin inscripciones */}
      {!inscripciones?.length && (
        <div className="text-center py-12 text-gray-400 text-sm">
          <p>No hay inscripciones en esta categoría todavía.</p>
        </div>
      )}

      {/* Lista */}
      {inscripciones?.map((insc) => (
        <div key={insc.id}>
          <InscripcionRow
            inscripcion={insc}
            calificaciones={calificaciones}
            criterios={criterios}
            isSelected={seleccionada === insc.id}
            onSelect={() => setSeleccionada(seleccionada === insc.id ? null : insc.id)}
          />

          {/* Formulario inline al seleccionar */}
          {seleccionada === insc.id && selectedInsc && (
            <div className="mt-2 mb-1">
              {criterios.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  Este evento aún no tiene criterios de evaluación configurados.
                </div>
              ) : (
                <CalificacionForm
                  inscripcion={selectedInsc}
                  criterios={criterios}
                  calificacionesExistentes={calificaciones}
                  juezId={juezId}
                  onGuardado={() => {
                    refetchCals();
                    setSeleccionada(null);
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Mensaje de todos completados */}
      {!!(inscripciones?.length) && calificadas === (inscripciones?.length ?? 0) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
          <p className="text-emerald-700 font-bold text-sm">✓ Todas las inscripciones calificadas</p>
          <Link href={`/calificar/${evId}`} className="text-xs text-emerald-600 mt-1 inline-block font-medium">
            Volver a categorías →
          </Link>
        </div>
      )}
    </div>
  );
}
