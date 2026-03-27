"use client";

import Link from "next/link";
import { useMisJueces } from "@/features/calificaciones/hooks";
import { useEvento } from "@/features/eventos/hooks";
import type { JuezRecord } from "@/features/calificaciones/types";

function EventoJuezCard({ juez }: { juez: JuezRecord }) {
  const { data: evento } = useEvento(juez.evento);

  return (
    <Link href={`/calificaciones/evento/${juez.evento}`}>
      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all group">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors">
              {evento?.nombre ?? `Evento #${juez.evento}`}
            </p>
            {evento && (
              <p className="text-sm text-gray-400 mt-0.5">
                {new Date(evento.fecha).toLocaleDateString("es-EC", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
          </div>
          <span className="text-sm text-indigo-600 font-medium">Calificar →</span>
        </div>
      </div>
    </Link>
  );
}

export default function CalificacionesPage() {
  const { data: jueces, isLoading, isError } = useMisJueces();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis Calificaciones</h1>
      <p className="text-sm text-gray-500 mb-6">
        Eventos en los que estás asignado como juez.
      </p>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          Error al cargar tus asignaciones.
        </div>
      )}

      {jueces && jueces.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No estás asignado como juez en ningún evento.</p>
        </div>
      )}

      {jueces && jueces.length > 0 && (
        <div className="space-y-3">
          {jueces.map((juez) => (
            <EventoJuezCard key={juez.id} juez={juez} />
          ))}
        </div>
      )}
    </div>
  );
}
