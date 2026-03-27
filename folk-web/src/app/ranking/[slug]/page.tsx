"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";

const BASE = process.env.NEXT_PUBLIC_API_URL;

const MODALIDAD_LABEL: Record<string, string> = {
  solista: "Solista",
  pareja: "Pareja",
  grupo: "Grupo",
};

interface Participante {
  nombre_completo: string;
}

interface DesgloseCriterio {
  criterio__nombre: string;
  promedio: string;
}

interface RankingInscripcion {
  posicion: number;
  id: number;
  nombre_acto: string;
  puntaje_final: string;
  participantes: Participante[];
  desglose: DesgloseCriterio[];
}

interface CategoriaRanking {
  categoria_id: number;
  nombre_ritmo: string;
  modalidad: string;
  inscripciones: RankingInscripcion[];
}

interface RankingData {
  evento: { id: number; nombre: string; fecha: string; ubicacion: string };
  categorias: CategoriaRanking[];
}

// ─── Fila de inscripción ──────────────────────────────────────────────────────

function FilaInscripcion({ ins }: { ins: RankingInscripcion }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => ins.desglose.length > 0 && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-center">
          <span className={`font-bold text-lg ${
            ins.posicion === 1 ? "text-yellow-500" :
            ins.posicion === 2 ? "text-gray-400" :
            ins.posicion === 3 ? "text-amber-600" :
            "text-gray-500"
          }`}>
            {ins.posicion === 1 ? "🥇" : ins.posicion === 2 ? "🥈" : ins.posicion === 3 ? "🥉" : ins.posicion}
          </span>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-gray-800">{ins.nombre_acto}</p>
          <p className="text-xs text-gray-400">
            {ins.participantes.map((p) => p.nombre_completo).join(", ")}
          </p>
        </td>
        <td className="px-4 py-3 text-right font-semibold text-indigo-700">
          {parseFloat(ins.puntaje_final).toFixed(2)}
          {ins.desglose.length > 0 && (
            <span className="ml-1 text-xs text-gray-300">{expanded ? "▲" : "▼"}</span>
          )}
        </td>
      </tr>
      {expanded && ins.desglose.length > 0 && (
        <tr className="bg-indigo-50">
          <td />
          <td colSpan={2} className="px-4 py-2">
            <div className="flex flex-wrap gap-3">
              {ins.desglose.map((d) => (
                <span key={d.criterio__nombre} className="text-xs text-indigo-700">
                  <span className="font-medium">{d.criterio__nombre}:</span>{" "}
                  {parseFloat(d.promedio).toFixed(2)}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function RankingPublicoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notPublished, setNotPublished] = useState(false);

  useEffect(() => {
    axios
      .get<RankingData>(`${BASE}/api/v1/ranking/${slug}/`)
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err?.response?.status === 403) {
          setNotPublished(true);
        } else {
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="animate-pulse text-indigo-400 text-sm">Cargando ranking…</div>
      </div>
    );
  }

  if (notPublished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-2xl font-bold text-gray-700">Resultados aún no disponibles</h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            El organizador publicará los resultados cuando la competencia finalice. ¡Vuelve pronto!
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Evento no encontrado</h1>
          <p className="text-gray-400 text-sm">El enlace puede ser incorrecto.</p>
        </div>
      </div>
    );
  }

  const fecha = new Date(data.evento.fecha).toLocaleDateString("es-EC", {
    year: "numeric", month: "long", day: "numeric",
  });

  const hayPuntajes = data.categorias.some((c) =>
    c.inscripciones.some((i) => parseFloat(i.puntaje_final) > 0)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wide mb-1">Folk</p>
          <h1 className="text-3xl font-bold text-gray-900">{data.evento.nombre}</h1>
          <p className="text-gray-500 text-sm mt-1">{fecha} · {data.evento.ubicacion}</p>
        </div>

        {!hayPuntajes ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
            <p className="text-lg">Las calificaciones aún no están disponibles.</p>
            <p className="text-sm mt-1">Vuelve más tarde.</p>
          </div>
        ) : (
          data.categorias.map((cat) => (
            <div key={cat.categoria_id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-indigo-600 flex items-center gap-2">
                <span className="font-semibold text-white">{cat.nombre_ritmo}</span>
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">
                  {MODALIDAD_LABEL[cat.modalidad] ?? cat.modalidad}
                </span>
              </div>

              {cat.inscripciones.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">Sin inscripciones.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
                      <th className="px-4 py-2 text-center w-12">#</th>
                      <th className="px-4 py-2 text-left">Acto</th>
                      <th className="px-4 py-2 text-right">Puntaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.inscripciones.map((ins) => (
                      <FilaInscripcion key={ins.id} ins={ins} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}

        <p className="text-center text-xs text-gray-400">
          Powered by <span className="font-semibold text-indigo-500">Folk</span>
        </p>
      </div>
    </div>
  );
}
