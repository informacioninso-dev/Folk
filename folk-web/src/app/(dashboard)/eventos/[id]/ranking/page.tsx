"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEventoRanking, useGetOrCreateRanking, usePublicarRanking } from "@/features/eventos/hooks";

const MODALIDAD_LABEL: Record<string, string> = {
  solista: "Solista", pareja: "Pareja", grupo: "Grupo",
};

export default function RankingEventoPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const { data: ranking, isLoading, isError } = useEventoRanking(eventoId);
  const { data: rankingRecord, isLoading: loadingRecord } = useGetOrCreateRanking(eventoId);
  const publicarMutation = usePublicarRanking();

  const isPublicado = rankingRecord?.estado === "publicado";

  if (isLoading || loadingRecord) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map((i) => <div key={i} className="h-32 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
        Error al cargar el ranking.
      </div>
    );
  }

  const hasPuntajes = ranking?.some((cat) =>
    cat.inscripciones.some((ins) => parseFloat(ins.puntaje_final) > 0)
  );

  return (
    <div className="space-y-6">

      {/* Panel de publicación */}
      <div className={`rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap ${
        isPublicado
          ? "bg-green-50 border border-green-200"
          : "bg-amber-50 border border-amber-200"
      }`}>
        <div>
          <p className={`font-semibold text-sm ${isPublicado ? "text-green-800" : "text-amber-800"}`}>
            {isPublicado ? "✓ Ranking publicado" : "Ranking en borrador"}
          </p>
          {isPublicado && rankingRecord?.publicado_en && (
            <p className="text-xs text-green-600 mt-0.5">
              Publicado el{" "}
              {new Date(rankingRecord.publicado_en).toLocaleDateString("es-EC", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
          {!isPublicado && (
            <p className="text-xs text-amber-700 mt-0.5">
              Los participantes no pueden ver los resultados hasta que publiques.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isPublicado && hasPuntajes && (
            <button
              onClick={() =>
                rankingRecord &&
                publicarMutation.mutate({ rankingId: rankingRecord.id, eventoId })
              }
              disabled={publicarMutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {publicarMutation.isPending ? "Publicando…" : "Publicar resultados"}
            </button>
          )}
          {isPublicado && (
            <Link
              href={`/ranking/${eventoId}`}
              target="_blank"
              className="px-4 py-2 bg-white border border-green-300 text-green-700 hover:bg-green-50 text-sm font-medium rounded-lg transition"
            >
              Ver página pública →
            </Link>
          )}
        </div>
      </div>

      {!hasPuntajes ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base">Aún no hay calificaciones registradas.</p>
          <p className="text-sm mt-1">
            Los jueces deben calificar desde su panel para que aparezcan resultados.
          </p>
        </div>
      ) : (
        ranking?.map((cat) => (
          <div key={cat.categoria_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-800">{cat.nombre_ritmo}</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {MODALIDAD_LABEL[cat.modalidad] ?? cat.modalidad}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {cat.inscripciones.length} participante{cat.inscripciones.length !== 1 ? "s" : ""}
              </span>
            </div>

            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-center text-xs text-gray-400 font-medium w-10">#</th>
                  <th className="px-4 py-2 text-left text-xs text-gray-400 font-medium">Acto</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-400 font-medium">Puntaje</th>
                </tr>
              </thead>
              <tbody>
                {cat.inscripciones.map((ins) => (
                  <tr key={ins.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-center font-bold text-gray-500">
                      {ins.posicion === 1 ? "🥇" : ins.posicion === 2 ? "🥈" : ins.posicion === 3 ? "🥉" : ins.posicion}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{ins.nombre_acto}</p>
                      <p className="text-xs text-gray-400">
                        {ins.participantes.map((p) => p.nombre_completo).join(", ")}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-700 tabular-nums">
                      {parseFloat(ins.puntaje_final).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      {hasPuntajes && (
        <p className="text-xs text-center text-gray-400">
          Actualizado automáticamente cada 15 s
        </p>
      )}
    </div>
  );
}
