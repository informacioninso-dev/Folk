"use client";

import Link from "next/link";
import { useEventos } from "@/features/eventos/hooks";

export default function RankingIndexPage() {
  const { data: eventos, isLoading } = useEventos();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Ranking</h1>
      <p className="text-sm text-gray-500 mb-4">Selecciona un evento para ver su ranking en vivo.</p>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {eventos && (
        <div className="space-y-2">
          {eventos.map((ev) => (
            <Link
              key={ev.id}
              href={`/ranking/evento/${ev.id}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3 hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <span className="font-medium text-gray-800">{ev.nombre}</span>
              <span className="text-sm text-indigo-600">Ver ranking →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
