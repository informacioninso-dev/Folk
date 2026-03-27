"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEvento,
  useCategorias,
  useInscripciones,
} from "@/features/eventos/hooks";
import { useMisJueces, useCalificaciones, useCriterios } from "@/features/calificaciones/hooks";
import type { CategoriaRitmo, Inscripcion } from "@/features/eventos/types";
import type { Calificacion } from "@/features/calificaciones/types";

const MODALIDAD_LABEL: Record<string, string> = {
  solista: "Solista",
  pareja: "Pareja",
  grupo: "Grupo",
};

// ─── Fila de inscripción ──────────────────────────────────────────────────────

interface InscripcionRowProps {
  inscripcion: Inscripcion;
  calificaciones: Calificacion[];
  totalCriterios: number;
}

function InscripcionRow({ inscripcion, calificaciones, totalCriterios }: InscripcionRowProps) {
  const misCalifs = calificaciones.filter((c) => c.inscripcion === inscripcion.id);
  const scored = misCalifs.length;
  const complete = totalCriterios > 0 && scored >= totalCriterios;

  return (
    <Link href={`/calificaciones/inscripcion/${inscripcion.id}`}>
      <div className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0 group">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-800 group-hover:text-indigo-700 transition-colors">
              {inscripcion.nombre_acto}
            </p>
            {/* Pago */}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              inscripcion.estado_pago
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}>
              {inscripcion.estado_pago ? "Pagado" : "Pendiente pago"}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {inscripcion.participantes.map((p) => p.nombre_completo).join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Progreso de calificación */}
          {totalCriterios > 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              complete
                ? "bg-indigo-100 text-indigo-700"
                : scored > 0
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-500"
            }`}>
              {complete ? "✓ Calificado" : scored > 0 ? `${scored}/${totalCriterios} criterios` : "Sin calificar"}
            </span>
          )}
          <span className="text-sm text-indigo-600 font-medium">
            {complete ? "Editar →" : "Calificar →"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Card de categoría ────────────────────────────────────────────────────────

interface CategoriaCardProps {
  categoria: CategoriaRitmo;
  calificaciones: Calificacion[];
  totalCriterios: number;
}

function CategoriaCard({ categoria, calificaciones, totalCriterios }: CategoriaCardProps) {
  const { data: inscripciones, isLoading } = useInscripciones(categoria.id);

  const totalIns = inscripciones?.length ?? 0;
  const completadas = inscripciones?.filter(
    (ins) => calificaciones.filter((c) => c.inscripcion === ins.id).length >= totalCriterios
  ).length ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800">{categoria.nombre_ritmo}</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {MODALIDAD_LABEL[categoria.modalidad] ?? categoria.modalidad}
          </span>
        </div>
        {totalIns > 0 && totalCriterios > 0 && (
          <span className="text-xs text-gray-500">
            {completadas}/{totalIns} calificadas
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 space-y-2 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      ) : !inscripciones || inscripciones.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">Sin inscripciones en esta categoría.</p>
      ) : (
        <div>
          {inscripciones.map((ins) => (
            <InscripcionRow
              key={ins.id}
              inscripcion={ins}
              calificaciones={calificaciones}
              totalCriterios={totalCriterios}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CalificacionesEventoPage() {
  const params = useParams();
  const eventoId = Number(params.eventoId);

  const { data: evento, isLoading: loadingEvento } = useEvento(eventoId);
  const { data: categorias, isLoading: loadingCategorias } = useCategorias(eventoId);
  const { data: misJueces } = useMisJueces();
  const { data: criterios } = useCriterios(eventoId);

  const juez = misJueces?.find((j) => j.evento === eventoId);
  const juezId = juez?.id;
  const totalCriterios = criterios?.length ?? 0;

  const { data: calificaciones = [] } = useCalificaciones(
    juezId ? { juez: juezId } : {}
  );

  if (loadingEvento) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-1" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/calificaciones" className="text-sm text-indigo-600 hover:underline mb-1 inline-block">
          ← Mis eventos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {evento?.nombre ?? `Evento #${eventoId}`}
        </h1>
        {evento && (
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(evento.fecha).toLocaleDateString("es-EC", {
              year: "numeric", month: "long", day: "numeric",
            })}
            {evento.ubicacion && ` · ${evento.ubicacion}`}
          </p>
        )}
      </div>

      {/* Resumen del juez */}
      {juezId && totalCriterios > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-3 text-sm text-indigo-700">
          {totalCriterios} criterio{totalCriterios !== 1 ? "s" : ""} de evaluación ·
          selecciona una inscripción para ingresar tu calificación.
        </div>
      )}

      {!juezId && !loadingEvento && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4 text-sm">
          No estás registrado como juez en este evento.
        </div>
      )}

      {loadingCategorias ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !categorias || categorias.length === 0 ? (
        <p className="text-gray-400 text-sm">No hay categorías registradas en este evento.</p>
      ) : (
        <div className="space-y-4">
          {categorias.map((cat) => (
            <CategoriaCard
              key={cat.id}
              categoria={cat}
              calificaciones={calificaciones}
              totalCriterios={totalCriterios}
            />
          ))}
        </div>
      )}
    </div>
  );
}
