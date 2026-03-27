"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getCategoriasPortal,
  type CategoriaRitmo,
  type CategoriasPortalResponse,
  type InscripcionExistente,
} from "@/features/portal/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODALIDAD_LABELS: Record<string, string> = {
  solista: "Solista",
  pareja:  "Pareja",
  grupo:   "Grupo",
};

const MODALIDAD_ICON: Record<string, string> = {
  solista: "👤",
  pareja:  "👥",
  grupo:   "🎭",
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  aprobada:  { label: "Aprobada",          cls: "bg-green-900/40 text-green-400 border-green-500/30" },
  pendiente: { label: "Pend. validación",  cls: "bg-yellow-900/40 text-yellow-400 border-yellow-500/30" },
  rechazada: { label: "Rechazada",         cls: "bg-red-900/40 text-red-400 border-red-500/30" },
};

function precio(cat: CategoriaRitmo) {
  if (cat.incluido_full_pass) return "Incluido en FP";
  const n = parseFloat(cat.precio_adicional);
  return n > 0 ? `$${n.toFixed(2)} adicional` : "Sin costo";
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CategoriasPage() {
  const { slug }       = useParams<{ slug: string }>();
  const searchParams   = useSearchParams();
  const initCedula     = searchParams.get("cedula") ?? "";

  const [cedula,    setCedula]    = useState(initCedula);
  const [buscando,  setBuscando]  = useState(false);
  const [data,      setData]      = useState<CategoriasPortalResponse | null>(null);
  const [error,     setError]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-consulta si hay cédula en la URL (ej. al volver desde inscripción)
  useEffect(() => {
    if (initCedula.length >= 6) {
      getCategoriasPortal(slug, initCedula)
        .then(setData)
        .catch(() => setError("No se pudo cargar la información."));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function consultar() {
    const ced = cedula.trim();
    if (ced.length < 6) { inputRef.current?.focus(); return; }
    setBuscando(true);
    setError("");
    setData(null);
    try {
      setData(await getCategoriasPortal(slug, ced));
    } catch {
      setError("No se pudo consultar. Intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  // Agrupar categorías por ritmo
  const porRitmo = (data?.categorias ?? []).reduce(
    (acc, cat) => {
      if (!acc[cat.nombre_ritmo]) acc[cat.nombre_ritmo] = [];
      acc[cat.nombre_ritmo].push(cat);
      return acc;
    },
    {} as Record<string, CategoriaRitmo[]>
  );

  const inscritasMap = new Set(
    (data?.inscripciones_existentes ?? []).map((i) => i.categoria_ritmo_id)
  );

  const fpAprobado  = data?.full_pass_estado === "aprobado";
  const fpPendiente = data?.full_pass_estado === "pendiente";
  const fpRechazado = data?.full_pass_estado === "rechazado";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={`/evento/${slug}`} className="text-gray-400 hover:text-white text-sm transition">
            ← Volver al evento
          </Link>
          <span className="text-xs text-gray-600">Categorías</span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-20 pb-16 space-y-8">

        {/* ── Búsqueda ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold mb-1">Mis inscripciones</h1>
          <p className="text-gray-400 text-sm mb-5">
            Ingresa tu cédula para consultar tu Full Pass y gestionar tus categorías.
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && consultar()}
              placeholder="Número de cédula o pasaporte"
              className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <button
              onClick={consultar}
              disabled={buscando || cedula.trim().length < 6}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold transition shrink-0"
            >
              {buscando ? "…" : "Consultar"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        {/* ── Resultados ───────────────────────────────────────────────────── */}
        {data && (
          <div className="space-y-8">

            {/* Estado Full Pass */}
            <FullPassBadge
              estado={data.full_pass_estado}
              slug={slug}
            />

            {/* Mis inscripciones */}
            <MisInscripciones inscripciones={data.inscripciones_existentes} />

            {/* Categorías disponibles (solo si FP aprobado) */}
            {fpAprobado && Object.keys(porRitmo).length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Categorías disponibles</h2>

                {Object.entries(porRitmo).map(([ritmo, categorias]) => (
                  <div key={ritmo} className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/10 bg-white/5">
                      <h3 className="font-bold text-white">{ritmo}</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                      {categorias.map((cat) => {
                        const yaInscrito = inscritasMap.has(cat.id);
                        const inscripcion = data.inscripciones_existentes.find(
                          (i) => i.categoria_ritmo_id === cat.id
                        );
                        return (
                          <CategoriaRow
                            key={cat.id}
                            cat={cat}
                            slug={slug}
                            cedula={cedula}
                            yaInscrito={yaInscrito}
                            inscripcion={inscripcion}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Mensaje si FP no aprobado */}
            {!fpAprobado && (
              <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 text-center space-y-2">
                <p className="text-gray-400 text-sm">
                  {fpPendiente
                    ? "Tu Full Pass está pendiente de aprobación. Una vez aprobado podrás inscribirte en categorías."
                    : fpRechazado
                    ? "Tu Full Pass fue rechazado."
                    : "No encontramos un Full Pass para esta cédula."}
                </p>
                {(fpRechazado || !data.full_pass_estado) && (
                  <Link
                    href={`/evento/${slug}/full-pass`}
                    className="inline-block mt-2 text-sm text-indigo-400 hover:underline"
                  >
                    {fpRechazado ? "Reenviar comprobante →" : "Pagar Full Pass →"}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function FullPassBadge({
  estado,
  slug,
}: {
  estado: CategoriasPortalResponse["full_pass_estado"];
  slug: string;
}) {
  if (estado === "aprobado") {
    return (
      <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-3">
        <span className="text-green-400 text-lg">✅</span>
        <span className="text-green-400 font-semibold text-sm">Full Pass aprobado</span>
      </div>
    );
  }
  if (estado === "pendiente") {
    return (
      <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-500/30 rounded-xl px-4 py-3">
        <span className="text-yellow-400 text-lg">⏳</span>
        <span className="text-yellow-400 font-semibold text-sm">Full Pass pendiente de aprobación</span>
      </div>
    );
  }
  if (estado === "rechazado") {
    return (
      <div className="flex items-center gap-3 bg-red-900/20 border border-red-500/30 rounded-xl px-4 py-3">
        <span className="text-red-400 text-lg">❌</span>
        <div>
          <p className="text-red-400 font-semibold text-sm">Full Pass rechazado</p>
          <Link href={`/evento/${slug}/full-pass`} className="text-indigo-400 text-xs hover:underline">
            Reenviar comprobante →
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 bg-gray-800 border border-white/10 rounded-xl px-4 py-3">
      <span className="text-gray-500 text-lg">ℹ️</span>
      <div>
        <p className="text-gray-300 text-sm">No encontramos un Full Pass para esta cédula.</p>
        <Link href={`/evento/${slug}/full-pass`} className="text-indigo-400 text-xs hover:underline">
          Pagar Full Pass →
        </Link>
      </div>
    </div>
  );
}

function MisInscripciones({ inscripciones }: { inscripciones: InscripcionExistente[] }) {
  if (inscripciones.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white">
        Mis inscripciones
        <span className="ml-2 text-sm font-normal text-gray-400">({inscripciones.length})</span>
      </h2>
      <div className="bg-gray-900 border border-white/10 rounded-2xl divide-y divide-white/5">
        {inscripciones.map((ins) => {
          const estado = ESTADO_CONFIG[ins.estado] ?? { label: ins.estado, cls: "bg-gray-700 text-gray-300" };
          return (
            <div key={ins.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-white truncate">{ins.nombre_acto}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {MODALIDAD_ICON[ins.modalidad]} {ins.ritmo} · {MODALIDAD_LABELS[ins.modalidad] ?? ins.modalidad}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${estado.cls}`}>
                {estado.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoriaRow({
  cat,
  slug,
  cedula,
  yaInscrito,
  inscripcion,
}: {
  cat: CategoriaRitmo;
  slug: string;
  cedula: string;
  yaInscrito: boolean;
  inscripcion?: InscripcionExistente;
}) {
  const estado = inscripcion ? ESTADO_CONFIG[inscripcion.estado] : null;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm">{MODALIDAD_ICON[cat.modalidad]}</span>
          <span className="text-sm font-medium text-white">
            {MODALIDAD_LABELS[cat.modalidad] ?? cat.modalidad}
          </span>
          {cat.incluido_full_pass ? (
            <span className="text-xs text-green-400 bg-green-900/30 border border-green-500/20 px-1.5 py-0.5 rounded-full">
              Incluido FP
            </span>
          ) : (
            <span className="text-xs text-gray-400">{precio(cat)}</span>
          )}
        </div>
        {inscripcion && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {inscripcion.nombre_acto}
          </p>
        )}
      </div>

      {yaInscrito && estado ? (
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${estado.cls}`}>
          {estado.label}
        </span>
      ) : (
        <Link
          href={`/evento/${slug}/categorias/${cat.id}?cedula=${cedula}`}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
        >
          Inscribirme
        </Link>
      )}
    </div>
  );
}
