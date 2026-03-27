"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useCategorias,
  useCrearCategoria,
  useEliminarCategoria,
  useInscripciones,
  useAprobarInscripcion,
  useRechazarInscripcion,
} from "@/features/eventos/hooks";
import type { CategoriaRitmo, Inscripcion } from "@/features/eventos/types";

const MODALIDAD_LABEL: Record<string, string> = {
  solista: "Solista", pareja: "Pareja", grupo: "Grupo",
};

const MODALIDAD_COLOR: Record<string, string> = {
  solista: "bg-purple-100 text-purple-700",
  pareja:  "bg-blue-100 text-blue-700",
  grupo:   "bg-emerald-100 text-emerald-700",
};

const TODAS_MODALIDADES = ["solista", "pareja", "grupo"] as const;

const ESTADO_INS_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  aprobada:  "bg-green-100 text-green-800",
  rechazada: "bg-red-100 text-red-800",
};

const ESTADO_INS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada:  "Aprobada",
  rechazada: "Rechazada",
};

// ─── Modal rechazo inscripción ────────────────────────────────────────────────

function ModalRechazoIns({
  inscripcion,
  categoriaId,
  onClose,
}: {
  inscripcion: Inscripcion;
  categoriaId: number;
  onClose: () => void;
}) {
  const [nota, setNota] = useState("");
  const rechazar = useRechazarInscripcion();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Rechazar inscripción</h3>
        <p className="text-sm text-gray-600"><strong>{inscripcion.nombre_acto}</strong></p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancelar
          </button>
          <button
            onClick={() => rechazar.mutate({ id: inscripcion.id, nota, categoriaId }, { onSuccess: onClose })}
            disabled={rechazar.isPending}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {rechazar.isPending ? "Guardando…" : "Rechazar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fila de inscripción ──────────────────────────────────────────────────────

function FilaInscripcion({
  ins,
  categoriaId,
  onRechazar,
}: {
  ins: Inscripcion;
  categoriaId: number;
  onRechazar: (ins: Inscripcion) => void;
}) {
  const aprobar = useAprobarInscripcion();

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-800 text-sm">{ins.nombre_acto}</p>
        {ins.academia && <p className="text-xs text-gray-400">{ins.academia}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {ins.participantes.map((p) => p.nombre_completo).join(", ") || "—"}
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          {ins.foto_url && <a href={ins.foto_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">Foto</a>}
          {ins.pista_musical_url && <a href={ins.pista_musical_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">Pista</a>}
          {ins.comprobante_categoria_url && <a href={ins.comprobante_categoria_url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 hover:underline">Comp.</a>}
          {!ins.foto_url && !ins.pista_musical_url && !ins.comprobante_categoria_url && <span className="text-gray-300 text-xs">—</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_INS_BADGE[ins.estado_inscripcion]}`}>
          {ESTADO_INS_LABEL[ins.estado_inscripcion]}
        </span>
        {ins.estado_inscripcion === "rechazada" && ins.nota_rechazo && (
          <p className="text-xs text-gray-400 mt-1">{ins.nota_rechazo}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {ins.estado_inscripcion === "pendiente" && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => aprobar.mutate({ id: ins.id, categoriaId })}
              disabled={aprobar.isPending}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
            >
              Aprobar
            </button>
            <button
              onClick={() => onRechazar(ins)}
              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition"
            >
              Rechazar
            </button>
          </div>
        )}
        {ins.estado_inscripcion === "aprobada" && (
          <button onClick={() => onRechazar(ins)} className="px-3 py-1 text-xs text-gray-400 hover:text-red-500 transition">
            Revocar
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Inscripciones por categoría ──────────────────────────────────────────────

function SeccionInscripciones({
  categoria,
  onRechazar,
}: {
  categoria: CategoriaRitmo;
  onRechazar: (ins: Inscripcion, catId: number) => void;
}) {
  const { data: inscripciones, isLoading } = useInscripciones(categoria.id);
  if (!inscripciones?.length && !isLoading) return null;

  const pendientes = inscripciones?.filter((i) => i.estado_inscripcion === "pendiente").length ?? 0;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">{categoria.nombre_ritmo}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODALIDAD_COLOR[categoria.modalidad]}`}>
          {MODALIDAD_LABEL[categoria.modalidad]}
        </span>
        {pendientes > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full ml-auto">
            {pendientes} pendiente{pendientes > 1 ? "s" : ""}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="p-4 animate-pulse"><div className="h-8 bg-gray-100 rounded" /></div>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-white">
            <tr>
              <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Acto</th>
              <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Participantes</th>
              <th className="text-center px-4 py-2 text-xs text-gray-400 font-medium">Archivos</th>
              <th className="text-center px-4 py-2 text-xs text-gray-400 font-medium">Estado</th>
              <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inscripciones!.map((ins) => (
              <FilaInscripcion
                key={ins.id}
                ins={ins}
                categoriaId={categoria.id}
                onRechazar={(i) => onRechazar(i, categoria.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ModalidadesPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const { data: categorias, isLoading } = useCategorias(eventoId);
  const crearMutation    = useCrearCategoria();
  const eliminarMutation = useEliminarCategoria();

  const [nombre,     setNombre]     = useState("");
  const [seleccion,  setSeleccion]  = useState<Set<string>>(new Set());
  const [modalIns,   setModalIns]   = useState<{ ins: Inscripcion; catId: number } | null>(null);

  const toggleModalidad = (m: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  const handleAgregar = async () => {
    if (!nombre.trim() || seleccion.size === 0) return;
    // Crea una entrada por cada tipo de participación seleccionado
    for (const modalidad of TODAS_MODALIDADES) {
      if (!seleccion.has(modalidad)) continue;
      await new Promise<void>((resolve) =>
        crearMutation.mutate(
          { evento: eventoId, nombre_ritmo: nombre.trim(), modalidad },
          { onSuccess: () => resolve(), onError: () => resolve() } // ignora duplicados
        )
      );
    }
    setNombre("");
    setSeleccion(new Set());
  };

  // Agrupa categorías por nombre de ritmo para mostrarlas juntas
  const porRitmo = (categorias ?? []).reduce<Record<string, CategoriaRitmo[]>>(
    (acc, cat) => {
      (acc[cat.nombre_ritmo] ??= []).push(cat);
      return acc;
    },
    {}
  );

  return (
    <>
      {modalIns && (
        <ModalRechazoIns
          inscripcion={modalIns.ins}
          categoriaId={modalIns.catId}
          onClose={() => setModalIns(null)}
        />
      )}

      <div className="space-y-6">
        {/* ─── Formulario de nuevo ritmo ──────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800">Categorías</h2>

          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="block text-xs text-gray-500 mb-1">Nombre del ritmo</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregar()}
                  placeholder="Ej: Salsa, Merengue, Folklore…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipos de participación</label>
                <div className="flex gap-2">
                  {TODAS_MODALIDADES.map((m) => {
                    const active = seleccion.has(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleModalidad(m)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition select-none ${
                          active
                            ? `${MODALIDAD_COLOR[m]} border-transparent`
                            : "bg-white text-gray-400 border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {MODALIDAD_LABEL[m]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={handleAgregar}
                disabled={crearMutation.isPending || !nombre.trim() || seleccion.size === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
              >
                {crearMutation.isPending ? "Guardando…" : "+ Agregar"}
              </button>
            </div>

            {seleccion.size === 0 && nombre.trim() && (
              <p className="text-xs text-amber-600">Selecciona al menos un tipo de participación.</p>
            )}
          </div>

          {/* ─── Lista agrupada por ritmo ─────────────────────────────────── */}
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : Object.keys(porRitmo).length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Aún no hay categorías. Agrega la primera arriba.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {Object.entries(porRitmo).map(([ritmo, cats]) => (
                <div key={ritmo} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{ritmo}</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {cats.map((cat) => (
                        <span
                          key={cat.id}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${MODALIDAD_COLOR[cat.modalidad]}`}
                        >
                          {MODALIDAD_LABEL[cat.modalidad]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {cats.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          if (confirm(`¿Eliminar "${cat.nombre_ritmo} - ${MODALIDAD_LABEL[cat.modalidad]}"?`))
                            eliminarMutation.mutate({ id: cat.id, eventoId });
                        }}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        ✕ {MODALIDAD_LABEL[cat.modalidad]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── Validación de inscripciones ─────────────────────────────────── */}
        {categorias && categorias.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-800">Inscripciones por modalidad</h2>
            {categorias.map((cat) => (
              <SeccionInscripciones
                key={cat.id}
                categoria={cat}
                onRechazar={(ins, catId) => setModalIns({ ins, catId })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
