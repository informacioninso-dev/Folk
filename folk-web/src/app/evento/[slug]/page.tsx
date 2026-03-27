"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getEventoPortal, type EventoPortal } from "@/features/portal/api";

export default function EventoPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [evento, setEvento] = useState<EventoPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getEventoPortal(slug)
      .then(setEvento)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !evento) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <p className="text-gray-700 text-lg font-semibold">Evento no encontrado o no disponible.</p>
        <Link href="/" className="text-orange-600 text-sm hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Folk
            </span>
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition shadow-sm"
          >
            Ingresar
          </Link>
        </div>
      </nav>

      {/* Banner hero */}
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-orange-100" style={{ aspectRatio: "21/9" }}>
            {evento.banner_url ? (
              <img
                src={evento.banner_url}
                alt={evento.nombre}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-orange-600 to-yellow-500" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />
            <div className="relative h-full flex flex-col justify-center px-10 max-w-xl py-8">
              <p className="text-orange-300 text-xs font-bold uppercase tracking-widest mb-2">
                {evento.organizador_nombre}
              </p>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight drop-shadow-xl">
                {evento.nombre}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
                  </svg>
                  {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-EC", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {evento.ubicacion}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-10">

        {/* Acciones principales */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            href={`/evento/${slug}/ranking`}
            label="Ranking"
            description="Ver resultados"
            disabled={!evento.ranking_revelado}
            disabledText="No disponible aún"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            }
            color="orange"
          />
          <ActionCard
            href={`/evento/${slug}/mi-agenda`}
            label="Mi Agenda"
            description="Ver mi horario"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15h.008v.008H12V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM9.75 15h.008v.008H9.75V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.875-2.25h.008v.008H15V12.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-9 3h.008v.008H6.375V15.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            }
            color="amber"
          />
          {evento.full_pass && (
            <ActionCard
              href={`/evento/${slug}/full-pass`}
              label={evento.full_pass.nombre}
              description={`$${parseFloat(evento.full_pass.precio).toFixed(2)} por participante`}
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
              }
              color="emerald"
            />
          )}
          <ActionCard
            href={`/evento/${slug}/categorias`}
            label="Inscribirse"
            description="Registrar categorías"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
              </svg>
            }
            color="red"
          />
        </section>

        {/* Descripción */}
        {evento.descripcion_portal && (
          <section className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Sobre el evento
            </h2>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-sm">
              {evento.descripcion_portal}
            </p>
          </section>
        )}

        {/* Tabla de precios */}
        {(evento.full_pass || evento.categorias.length > 0) && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-orange-50 bg-gradient-to-r from-orange-50 to-amber-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
                Tabla de precios
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-8 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Modalidad</th>
                    <th className="px-8 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {evento.full_pass && (
                    <tr className="hover:bg-orange-50/40 transition">
                      <td className="px-8 py-4 font-semibold text-orange-700">
                        {evento.full_pass.nombre}
                        {evento.full_pass.es_requerido && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                            Requerido
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-500">Por participante</td>
                      <td className="px-8 py-4 text-right font-bold text-gray-900 text-base">
                        ${parseFloat(evento.full_pass.precio).toFixed(2)}
                      </td>
                    </tr>
                  )}
                  {evento.categorias.map((cat) => (
                    <tr key={cat.id} className="hover:bg-orange-50/40 transition">
                      <td className="px-8 py-4 text-gray-800 font-medium">{cat.nombre_ritmo}</td>
                      <td className="px-4 py-4 text-gray-500 capitalize">{cat.modalidad}</td>
                      <td className="px-8 py-4 text-right font-semibold text-gray-900">
                        {parseFloat(cat.precio_adicional) > 0
                          ? `$${parseFloat(cat.precio_adicional).toFixed(2)}`
                          : <span className="text-emerald-600 font-semibold">Incluido</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-8">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="font-extrabold">Folk</span>
          </Link>
          <p className="text-xs text-gray-500">Plataforma de concursos de baile</p>
        </div>
      </footer>
    </div>
  );
}

const colorMap = {
  orange:  "bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-500 hover:text-white hover:border-orange-500",
  amber:   "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-500 hover:text-white hover:border-amber-500",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
  red:     "bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white hover:border-red-600",
};

function ActionCard({
  href,
  label,
  description,
  icon,
  disabled = false,
  disabledText,
  color = "orange",
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
  disabledText?: string;
  color?: keyof typeof colorMap;
}) {
  const inner = (
    <div
      className={`group flex flex-col items-start gap-3 rounded-2xl p-6 border transition-all duration-200 ${
        disabled
          ? "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
          : `${colorMap[color]} cursor-pointer`
      }`}
    >
      <div className={`${disabled ? "text-gray-300" : ""}`}>{icon}</div>
      <div>
        <p className="font-bold text-sm">{label}</p>
        <p className={`text-xs mt-0.5 ${disabled ? "text-gray-300" : "opacity-70"}`}>
          {disabled ? disabledText : description}
        </p>
      </div>
    </div>
  );

  if (disabled) return inner;
  return <Link href={href}>{inner}</Link>;
}
