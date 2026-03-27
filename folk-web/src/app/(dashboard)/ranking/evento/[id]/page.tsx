"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEventoRanking, useEvento } from "@/features/eventos/hooks";
import type { RankingCategoria } from "@/features/eventos/types";

function CategoriaRanking({ cat }: { cat: RankingCategoria }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <span className="font-semibold text-gray-800">{cat.nombre_ritmo}</span>
        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full capitalize">
          {cat.modalidad}
        </span>
      </div>
      {cat.inscripciones.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">Sin resultados.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-white">
            <tr>
              <th className="text-center px-4 py-2 text-xs text-gray-400 font-medium w-10">#</th>
              <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Acto</th>
              <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Puntaje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cat.inscripciones.map((ins) => (
              <tr key={ins.id} className="hover:bg-gray-50">
                <td className="text-center px-4 py-2.5 text-lg">
                  {ins.posicion === 1 ? "🥇" : ins.posicion === 2 ? "🥈" : ins.posicion === 3 ? "🥉" : ins.posicion}
                </td>
                <td className="px-4 py-2.5 font-medium text-gray-800">{ins.nombre_acto}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-indigo-700">
                  {parseFloat(ins.puntaje_final).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function RankingEventoPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: evento } = useEvento(id);
  const { data: ranking, isLoading, dataUpdatedAt } = useEventoRanking(id);

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("es-EC")
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/eventos/${id}`} className="text-sm text-indigo-600 hover:underline mb-1 inline-block">
            ← Volver al evento
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Ranking — {evento?.nombre ?? `Evento #${id}`}
          </h1>
        </div>
        {updatedAt && (
          <span className="text-xs text-gray-400 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
            ● En vivo · {updatedAt}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {ranking && ranking.length === 0 && (
        <p className="text-gray-400">Sin categorías para mostrar.</p>
      )}

      {ranking && ranking.length > 0 && (
        <div className="space-y-6">
          {ranking.map((cat) => (
            <CategoriaRanking key={cat.categoria_id} cat={cat} />
          ))}
        </div>
      )}
    </div>
  );
}
