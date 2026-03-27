"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useCriteriosEvento,
  useCrearCriterio,
  useEliminarCriterio,
} from "@/features/eventos/hooks";

export default function CriteriosPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const { data: criterios, isLoading } = useCriteriosEvento(eventoId);
  const crearMutation    = useCrearCriterio();
  const eliminarMutation = useEliminarCriterio();

  const [nombre, setNombre] = useState("");

  const handleAgregar = () => {
    if (!nombre.trim()) return;
    crearMutation.mutate(
      { evento: eventoId, nombre: nombre.trim() },
      { onSuccess: () => setNombre("") }
    );
  };

  return (
    <div className="space-y-4">

      {/* Formulario inline */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Nombre del criterio</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAgregar()}
            placeholder="Ej: Técnica, Expresión, Vestuario…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>
        <button
          onClick={handleAgregar}
          disabled={crearMutation.isPending || !nombre.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          + Agregar
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !criterios?.length ? (
        <p className="text-gray-400 text-sm text-center py-10">
          Sin criterios de evaluación. Agrega el primero arriba.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {criterios.map((c, idx) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-5 py-3 ${
                idx > 0 ? "border-t border-gray-100" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 tabular-nums w-5 text-right">
                  {idx + 1}
                </span>
                <span className="font-medium text-gray-800">{c.nombre}</span>
              </div>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar criterio "${c.nombre}"?`)) {
                    eliminarMutation.mutate({ id: c.id, eventoId });
                  }
                }}
                className="text-xs text-red-400 hover:text-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
