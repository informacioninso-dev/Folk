"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCategoriaRanking } from "@/features/eventos/hooks";

export default function RankingCategoriaPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: ranking, isLoading, dataUpdatedAt } = useCategoriaRanking(id);

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("es-EC")
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/eventos" className="text-sm text-indigo-600 hover:underline mb-1 inline-block">
            ← Volver
          </Link>
          {ranking && (
            <h1 className="text-2xl font-bold text-gray-900">
              {ranking.nombre_ritmo}
              <span className="ml-2 text-base font-normal text-gray-500 capitalize">
                · {ranking.modalidad}
              </span>
            </h1>
          )}
        </div>
        {updatedAt && (
          <span className="text-xs text-gray-400">Actualizado: {updatedAt}</span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {ranking && ranking.inscripciones.length === 0 && (
        <p className="text-gray-400 text-sm">Sin resultados aún.</p>
      )}

      {ranking && ranking.inscripciones.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium w-12">#</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Acto</th>
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Participantes</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Puntaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ranking.inscripciones.map((ins) => (
                <tr
                  key={ins.id}
                  className={`transition-colors ${
                    ins.posicion === 1
                      ? "bg-yellow-50"
                      : ins.posicion === 2
                      ? "bg-gray-50"
                      : ins.posicion === 3
                      ? "bg-orange-50"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="text-center px-4 py-3 font-bold text-lg">
                    {ins.posicion === 1
                      ? "🥇"
                      : ins.posicion === 2
                      ? "🥈"
                      : ins.posicion === 3
                      ? "🥉"
                      : ins.posicion}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{ins.nombre_acto}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {ins.participantes.map((p) => p.nombre_completo).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-bold text-indigo-700 text-base">
                    {parseFloat(ins.puntaje_final).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
