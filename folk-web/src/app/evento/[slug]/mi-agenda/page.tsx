"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getMiAgenda, type AgendaItem } from "@/features/portal/api";

const MODALIDAD_LABELS: Record<string, string> = {
  solista: "Solista",
  pareja: "Pareja",
  grupo: "Grupo",
};

export default function MiAgendaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [cedula, setCedula] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<{ cedula: string; items: AgendaItem[] } | null>(null);
  const [error, setError] = useState("");

  async function buscar() {
    if (cedula.length < 4) return;
    setBuscando(true);
    setError("");
    try {
      const data = await getMiAgenda(slug, cedula);
      setResultado(data);
    } catch {
      setError("No se pudo consultar. Intenta nuevamente.");
    } finally {
      setBuscando(false);
    }
  }

  const porFecha = resultado?.items.reduce(
    (acc, item) => {
      const key = item.fecha ?? "Sin fecha";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, AgendaItem[]>
  ) ?? {};

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center">
          <Link href={`/evento/${slug}`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Volver al evento
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-24 pb-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">Mi Agenda</h1>
          <p className="text-gray-500 text-sm">Ingresa tu cédula para ver tu horario de participación.</p>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8 shadow-sm">
          <div className="flex gap-2">
            <input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder="Número de cédula"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
            <button
              onClick={buscar}
              disabled={buscando || cedula.length < 4}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              {buscando ? "Buscando…" : "Ver agenda"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">{error}</p>
        )}

        {/* Resultado */}
        {resultado && (
          resultado.items.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
                </svg>
              </div>
              <p className="text-gray-800 font-semibold mb-1">No encontramos tu agenda</p>
              <p className="text-gray-400 text-sm">
                Es posible que el cronograma no haya sido generado o que no estés inscrito.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(porFecha).map(([fecha, items]) => (
                <div key={fecha}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gray-200" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                      {fecha !== "Sin fecha"
                        ? new Date(fecha + "T00:00:00").toLocaleDateString("es-EC", {
                            weekday: "long", day: "numeric", month: "long",
                          })
                        : "Sin fecha asignada"}
                    </h2>
                    <div className="h-px flex-1 bg-gray-200" />
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-100 rounded-2xl p-5 flex gap-5 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Hora */}
                        <div className="text-center min-w-[56px]">
                          {item.hora_inicio ? (
                            <>
                              <p className="text-indigo-600 font-extrabold text-base leading-tight">
                                {item.hora_inicio.slice(0, 5)}
                              </p>
                              {item.hora_fin && (
                                <p className="text-gray-400 text-xs mt-0.5">{item.hora_fin.slice(0, 5)}</p>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 text-xs font-bold rounded-full">
                              {item.orden}
                            </span>
                          )}
                        </div>

                        <div className="w-px bg-gray-100" />

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">
                            {item.nombre_acto ?? item.titulo}
                          </p>
                          {item.ritmo && (
                            <p className="text-indigo-500 text-xs mt-1 font-medium">
                              {item.ritmo} · {MODALIDAD_LABELS[item.modalidad ?? ""] ?? item.modalidad}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
