"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getEventoPortal,
  getRankingPortal,
  type EventoPortal,
  type RankingCategoria,
} from "@/features/portal/api";

const MODALIDADES = [
  { value: "", label: "Todas" },
  { value: "solista", label: "Solista" },
  { value: "pareja", label: "Pareja" },
  { value: "grupo", label: "Grupo" },
];

const MEDALLAS = ["🥇", "🥈", "🥉"];

export default function RankingPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [evento, setEvento] = useState<EventoPortal | null>(null);
  const [ritmoFiltro, setRitmoFiltro] = useState("");
  const [modalidadFiltro, setModalidadFiltro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<RankingCategoria[] | null>(null);
  const [noPublicado, setNoPublicado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getEventoPortal(slug).then(setEvento).catch(() => null);
  }, [slug]);

  async function consultar() {
    setBuscando(true);
    setError("");
    setNoPublicado(false);
    try {
      const data = await getRankingPortal(slug, ritmoFiltro || undefined, modalidadFiltro || undefined);
      setResultado(data.categorias);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 403) {
        setNoPublicado(true);
      } else {
        setError("Error al consultar el ranking.");
      }
    } finally {
      setBuscando(false);
    }
  }

  // Ritmos únicos de las categorías del evento
  const ritmos = Array.from(new Set(evento?.categorias.map((c) => c.nombre_ritmo) ?? []));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Link href={`/evento/${slug}`} className="text-gray-400 hover:text-white text-sm transition">
            ← Volver al evento
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        <h1 className="text-3xl font-bold mb-2">Ranking</h1>
        <p className="text-gray-400 mb-8">
          Selecciona un ritmo y modalidad para consultar los primeros lugares.
        </p>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={ritmoFiltro}
            onChange={(e) => setRitmoFiltro(e.target.value)}
            className="bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos los ritmos</option>
            {ritmos.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <select
            value={modalidadFiltro}
            onChange={(e) => setModalidadFiltro(e.target.value)}
            className="bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
          >
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <button
            onClick={consultar}
            disabled={buscando}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-2.5 rounded-lg font-semibold transition"
          >
            {buscando ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {noPublicado && (
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-3">🏆</p>
            <p className="text-gray-300 font-semibold">El ranking aún no ha sido revelado</p>
            <p className="text-gray-500 text-sm mt-1">
              El organizador publicará los resultados cuando el evento concluya.
            </p>
          </div>
        )}

        {/* Resultados */}
        {resultado && !noPublicado && (
          <div className="space-y-6">
            {resultado.length === 0 ? (
              <p className="text-gray-400">No se encontraron resultados para los filtros seleccionados.</p>
            ) : (
              resultado.map((cat) => (
                <div key={`${cat.ritmo}-${cat.modalidad}`} className="bg-gray-900 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold">{cat.ritmo}</h2>
                    <span className="bg-indigo-900 text-indigo-300 text-sm px-3 py-0.5 rounded-full capitalize">
                      {cat.modalidad}
                    </span>
                  </div>

                  {cat.top3.length === 0 ? (
                    <p className="text-gray-500 text-sm">Sin resultados aún.</p>
                  ) : (
                    <div className="space-y-3">
                      {cat.top3.map((entry) => (
                        <div
                          key={entry.posicion}
                          className={`flex items-center gap-4 p-4 rounded-xl border ${
                            entry.posicion === 1
                              ? "bg-yellow-900/20 border-yellow-500/30"
                              : entry.posicion === 2
                              ? "bg-gray-700/30 border-gray-500/30"
                              : "bg-orange-900/10 border-orange-700/20"
                          }`}
                        >
                          <span className="text-3xl">{MEDALLAS[entry.posicion - 1]}</span>
                          <div className="flex-1">
                            <p className="font-bold">{entry.nombre_acto}</p>
                          </div>
                          <p className="text-xl font-bold text-white">
                            {parseFloat(entry.puntaje_final).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
