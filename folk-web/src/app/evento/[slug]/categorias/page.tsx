"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getCategoriasPortal,
  type CategoriaRitmo,
  type CategoriasPortalResponse,
} from "@/features/portal/api";

const MODALIDAD_LABELS: Record<string, string> = {
  solista: "Solista",
  pareja: "Pareja",
  grupo: "Grupo",
};

export default function CategoriasPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const [cedula, setCedula] = useState(searchParams.get("cedula") ?? "");
  const [buscando, setBuscando] = useState(false);
  const [data, setData] = useState<CategoriasPortalResponse | null>(null);
  const [error, setError] = useState("");

  async function consultar() {
    if (cedula.length < 4) return;
    setBuscando(true);
    setError("");
    try {
      const res = await getCategoriasPortal(slug, cedula);
      setData(res);
    } catch {
      setError("No se pudo consultar. Intenta nuevamente.");
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    if (cedula.length >= 4) consultar();
  }, []);

  // Agrupar categorías por ritmo
  const porRitmo = data?.categorias.reduce(
    (acc, cat) => {
      if (!acc[cat.nombre_ritmo]) acc[cat.nombre_ritmo] = [];
      acc[cat.nombre_ritmo].push(cat);
      return acc;
    },
    {} as Record<string, CategoriaRitmo[]>
  ) ?? {};

  const fpEstado = data?.full_pass_estado;
  const fpAprobado = fpEstado === "aprobado";

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
        <h1 className="text-3xl font-bold mb-2">Registrar Categorías</h1>
        <p className="text-gray-400 mb-8">
          Ingresa tu cédula para ver las categorías disponibles e inscribirte.
        </p>

        {/* Búsqueda por cédula */}
        <div className="flex gap-3 mb-8">
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            placeholder="Número de cédula"
            className="flex-1 bg-gray-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={consultar}
            disabled={buscando || cedula.length < 4}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2.5 rounded-lg font-semibold transition"
          >
            {buscando ? "..." : "Consultar"}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {data && (
          <>
            {/* Estado Full Pass */}
            <div className={`rounded-xl p-4 mb-6 border ${
              fpAprobado
                ? "bg-green-900/20 border-green-500/30"
                : fpEstado === "pendiente"
                ? "bg-yellow-900/20 border-yellow-500/30"
                : fpEstado === "rechazado"
                ? "bg-red-900/20 border-red-500/30"
                : "bg-gray-800 border-white/10"
            }`}>
              {fpEstado === null && (
                <p className="text-gray-300">
                  No encontramos un Full Pass para esta cédula.{" "}
                  <Link href={`/evento/${slug}/full-pass`} className="text-indigo-400 hover:underline">
                    Pagar Full Pass →
                  </Link>
                </p>
              )}
              {fpEstado === "pendiente" && (
                <p className="text-yellow-400">
                  ⏳ Tu Full Pass está pendiente de aprobación. Una vez aprobado podrás registrar categorías.
                </p>
              )}
              {fpEstado === "rechazado" && (
                <p className="text-red-400">
                  ❌ Tu Full Pass fue rechazado.{" "}
                  <Link href={`/evento/${slug}/full-pass`} className="text-indigo-400 hover:underline">
                    Reenviar comprobante →
                  </Link>
                </p>
              )}
              {fpAprobado && (
                <p className="text-green-400 font-semibold">✅ Full Pass aprobado — puedes registrar categorías</p>
              )}
            </div>

            {/* Inscripciones existentes */}
            {(data.inscripciones_existentes?.length ?? 0) > 0 && (
              <div className="bg-gray-900 border border-white/10 rounded-xl p-5 mb-6">
                <h2 className="font-bold text-lg mb-3">Mis inscripciones</h2>
                <div className="space-y-2">
                  {data.inscripciones_existentes.map((ins) => (
                    <div key={ins.id} className="flex items-center justify-between text-sm">
                      <span>
                        {ins.ritmo} — {MODALIDAD_LABELS[ins.modalidad] ?? ins.modalidad}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        ins.estado === "aprobada"
                          ? "bg-green-900 text-green-400"
                          : ins.estado === "rechazada"
                          ? "bg-red-900 text-red-400"
                          : "bg-yellow-900 text-yellow-400"
                      }`}>
                        {ins.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categorías disponibles */}
            {fpAprobado && Object.keys(porRitmo).length > 0 && (
              <div className="space-y-6">
                <h2 className="font-bold text-xl">Categorías disponibles</h2>
                {Object.entries(porRitmo).map(([ritmo, categorias]) => (
                  <div key={ritmo} className="bg-gray-900 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-lg font-bold mb-4">{ritmo}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {categorias.map((cat) => (
                        <div
                          key={cat.id}
                          className="bg-gray-800 rounded-xl p-4 border border-white/5"
                        >
                          <p className="font-semibold capitalize">{cat.modalidad}</p>
                          {cat.edad_min && cat.edad_max && (
                            <p className="text-gray-400 text-xs mt-1">
                              {cat.edad_min}–{cat.edad_max} años
                            </p>
                          )}
                          <p className="text-indigo-400 font-bold mt-2">
                            {parseFloat(cat.precio_adicional) > 0
                              ? `$${parseFloat(cat.precio_adicional).toFixed(2)}`
                              : "Incluido"}
                          </p>
                          <Link
                            href={`/evento/${slug}/categorias/${cat.id}?cedula=${cedula}`}
                            className="block mt-3 text-center bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2 rounded-lg transition"
                          >
                            Inscribirse
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
