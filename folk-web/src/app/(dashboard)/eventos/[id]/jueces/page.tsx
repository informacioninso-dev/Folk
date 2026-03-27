"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useJuecesEvento,
  useAgregarJuez,
  useEliminarJuez,
  useBuscarUsuario,
  useSetJuezCategorias,
  useCategorias,
} from "@/features/eventos/hooks";
import type { JuezItem, JuezCategoriaDetalle, UsuarioResultado } from "@/features/eventos/api";
import type { CategoriaRitmo } from "@/features/eventos/types";

const MODALIDAD_LABEL: Record<string, string> = {
  solista: "Solista",
  pareja:  "Pareja",
  grupo:   "Grupo",
};

const MODALIDAD_COLOR: Record<string, string> = {
  solista: "bg-orange-50 text-orange-700 border-orange-200",
  pareja:  "bg-amber-50  text-amber-700  border-amber-200",
  grupo:   "bg-red-50    text-red-700    border-red-200",
};

// ─── Selector de categorías por juez ─────────────────────────────────────────

function CategoriasEditor({
  juez,
  categorias,
  eventoId,
  onClose,
}: {
  juez: JuezItem;
  categorias: CategoriaRitmo[];
  eventoId: number;
  onClose: () => void;
}) {
  const [seleccionadas, setSeleccionadas] = useState<Set<number>>(
    new Set(juez.categorias)
  );
  const mutation = useSetJuezCategorias(eventoId);

  const toggle = (id: number) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const guardar = () => {
    mutation.mutate(
      { juezId: juez.id, categorias: Array.from(seleccionadas) },
      { onSuccess: onClose }
    );
  };

  // Group by ritmo name
  const grouped = categorias.reduce<Record<string, CategoriaRitmo[]>>((acc, cat) => {
    (acc[cat.nombre_ritmo] ??= []).push(cat);
    return acc;
  }, {});

  return (
    <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Asignar categorías a {juez.usuario_email}
      </p>

      {Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-gray-400">
          Este evento aún no tiene categorías. Agrégalas en &quot;Modalidades&quot;.
        </p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([ritmo, cats]) => (
            <div key={ritmo}>
              <p className="text-xs font-bold text-gray-700 mb-1.5">{ritmo}</p>
              <div className="flex flex-wrap gap-2">
                {cats.map((cat) => {
                  const checked = seleccionadas.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggle(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        checked
                          ? "bg-orange-500 text-white border-orange-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <span className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                        checked ? "bg-white border-white" : "border-gray-300"
                      }`}>
                        {checked && (
                          <svg className="w-2 h-2 text-orange-500" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          </svg>
                        )}
                      </span>
                      {MODALIDAD_LABEL[cat.modalidad] ?? cat.modalidad}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={guardar}
          disabled={mutation.isPending}
          className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
        >
          {mutation.isPending ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Fila de juez ─────────────────────────────────────────────────────────────

function JuezRow({
  juez,
  idx,
  eventoId,
  categorias,
  eliminarMutation,
}: {
  juez: JuezItem;
  idx: number;
  eventoId: number;
  categorias: CategoriaRitmo[];
  eliminarMutation: ReturnType<typeof useEliminarJuez>;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <div className={idx > 0 ? "border-t border-gray-100" : ""}>
      <div className="flex items-start justify-between px-5 py-3 gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm">{juez.usuario_email}</p>

          {/* Chips de categorías asignadas */}
          {juez.categorias_detalle.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {juez.categorias_detalle.map((cd: JuezCategoriaDetalle) => (
                <span
                  key={cd.id}
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                    MODALIDAD_COLOR[cd.modalidad] ?? "bg-gray-50 text-gray-600 border-gray-200"
                  }`}
                >
                  <span className="font-semibold">{cd.nombre_ritmo}</span>
                  <span className="opacity-60">·</span>
                  {MODALIDAD_LABEL[cd.modalidad] ?? cd.modalidad}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Sin categorías asignadas</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setEditando((v) => !v)}
            className="text-xs text-orange-500 hover:text-orange-700 font-medium transition"
          >
            {editando ? "Cerrar" : juez.categorias_detalle.length > 0 ? "Editar" : "Asignar"}
          </button>
          <button
            onClick={() => eliminarMutation.mutate({ id: juez.id, eventoId })}
            className="text-xs text-red-400 hover:text-red-600 transition"
          >
            Quitar
          </button>
        </div>
      </div>

      {editando && (
        <div className="px-5 pb-4">
          <CategoriasEditor
            juez={juez}
            categorias={categorias}
            eventoId={eventoId}
            onClose={() => setEditando(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function JuecesPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const { data: jueces, isLoading }        = useJuecesEvento(eventoId);
  const { data: categorias = [] }          = useCategorias(eventoId);
  const agregarMutation                    = useAgregarJuez();
  const eliminarMutation                   = useEliminarJuez();

  const [busqueda,            setBusqueda]            = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioResultado | null>(null);

  const { data: resultados } = useBuscarUsuario(busqueda);

  const handleAgregar = () => {
    if (!usuarioSeleccionado) return;
    agregarMutation.mutate(
      { usuario: usuarioSeleccionado.id, evento: eventoId },
      {
        onSuccess: () => {
          setBusqueda("");
          setUsuarioSeleccionado(null);
        },
      }
    );
  };

  const juezIds = new Set(jueces?.map((j) => j.usuario) ?? []);

  return (
    <div className="space-y-4">

      {/* Buscador */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-gray-700">Agregar juez</p>
        <div className="relative">
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setUsuarioSeleccionado(null);
            }}
            placeholder="Buscar por nombre de usuario…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition"
          />
          {resultados && resultados.length > 0 && !usuarioSeleccionado && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {resultados
                .filter((u) => !juezIds.has(u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setUsuarioSeleccionado(u);
                      setBusqueda(u.username);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 transition-colors text-sm"
                  >
                    <span className="font-medium text-gray-800">{u.username}</span>
                    <span className="ml-2 text-gray-400">{u.email}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {usuarioSeleccionado && (
          <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <span className="text-sm text-orange-800 font-medium">
              {usuarioSeleccionado.username} — {usuarioSeleccionado.email}
            </span>
            <button
              onClick={handleAgregar}
              disabled={agregarMutation.isPending}
              className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-3 py-1 rounded-lg transition"
            >
              {agregarMutation.isPending ? "Agregando…" : "Confirmar"}
            </button>
          </div>
        )}

        {agregarMutation.isError && (
          <p className="text-xs text-red-500">
            Error al agregar. El usuario puede ya estar asignado.
          </p>
        )}
      </div>

      {/* Lista de jueces */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !jueces?.length ? (
        <p className="text-gray-400 text-sm text-center py-10">
          Sin jueces asignados. Búscalos arriba.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {jueces.map((j: JuezItem, idx) => (
            <JuezRow
              key={j.id}
              juez={j}
              idx={idx}
              eventoId={eventoId}
              categorias={categorias}
              eliminarMutation={eliminarMutation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
