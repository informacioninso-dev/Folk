"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEvento, useActualizarEvento } from "@/features/eventos/hooks";

const NAV_ITEMS = [
  { slug: "portal",        label: "Portal"         },
  { slug: "pagos",         label: "Pagos"          },
  { slug: "participantes", label: "Participantes"  },
  { slug: "modalidades",   label: "Categorías"     },
  { slug: "jueces",        label: "Jueces"         },
  { slug: "criterios",     label: "Criterios"      },
  { slug: "ranking",       label: "Ranking"        },
  { slug: "cronograma",    label: "Cronograma"     },
  { slug: "agenda",        label: "Agenda"         },
];

export default function EventoLayout({ children }: { children: React.ReactNode }) {
  const params   = useParams();
  const pathname = usePathname();
  const id       = Number(params.id);

  const { data: evento, isLoading } = useEvento(id);
  const actualizarMutation = useActualizarEvento();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 pt-2">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="flex gap-2 mt-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 rounded-lg w-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="text-gray-500 text-sm py-10 text-center">
        Evento no encontrado.
      </div>
    );
  }

  const fecha = new Date(evento.fecha).toLocaleDateString("es-EC", {
    year: "numeric", month: "long", day: "numeric",
  });

  const base = `/eventos/${id}`;

  return (
    <div className="space-y-0">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pb-0">

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Link
              href="/eventos"
              className="text-sm text-indigo-600 hover:underline mb-1 inline-block"
            >
              ← Mis eventos
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{evento.nombre}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {fecha} · {evento.ubicacion}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Toggle activo */}
            <button
              onClick={() =>
                actualizarMutation.mutate({ id, data: { activo: !evento.activo } })
              }
              disabled={actualizarMutation.isPending}
              className={`text-sm px-3 py-2 rounded-lg font-medium transition ${
                evento.activo
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {evento.activo ? "● Activo" : "○ Inactivo"}
            </button>

            {/* Toggle portal activo */}
            <button
              onClick={() =>
                actualizarMutation.mutate({ id, data: { portal_activo: !evento.portal_activo } })
              }
              disabled={actualizarMutation.isPending}
              className={`inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium transition ${
                evento.portal_activo && evento.pago_folk_confirmado
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : evento.portal_activo && !evento.pago_folk_confirmado
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              title={
                evento.portal_activo && !evento.pago_folk_confirmado
                  ? "Listo para publicar — esperando autorización de Folk"
                  : undefined
              }
            >
              {evento.portal_activo && evento.pago_folk_confirmado && "● Portal publicado"}
              {evento.portal_activo && !evento.pago_folk_confirmado && (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  En espera de Folk
                </>
              )}
              {!evento.portal_activo && "○ Portal oculto"}
            </button>

            {/* Link al portal público — solo cuando está realmente publicado */}
            {evento.portal_activo && evento.pago_folk_confirmado && evento.slug && (
              <Link
                href={`/evento/${evento.slug}`}
                target="_blank"
                className="text-sm px-3 py-2 rounded-lg font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 transition"
              >
                Ver portal →
              </Link>
            )}

            {/* Link al ranking público */}
            <Link
              href={`/ranking/${evento.slug}`}
              target="_blank"
              className="text-sm px-3 py-2 rounded-lg font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition"
            >
              Ver ranking →
            </Link>
          </div>
        </div>

        {/* Banner link público de inscripción */}
        {evento.activo && evento.slug && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-indigo-500 font-medium mb-0.5">
                Link público de inscripción
              </p>
              <p className="text-sm text-indigo-800 font-mono truncate">
                {typeof window !== "undefined" ? window.location.origin : ""}/registro/{evento.slug}
              </p>
            </div>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/registro/${evento.slug}`
                )
              }
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition shrink-0"
            >
              Copiar
            </button>
          </div>
        )}

        {/* ── Nav tabs ──────────────────────────────────────────────────────── */}
        <nav className="flex gap-0 border-b border-gray-200 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {NAV_ITEMS.map(({ slug, label }) => {
            const href     = `${base}/${slug}`;
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={slug}
                href={href}
                className={`px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  isActive
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Contenido de la sub-ruta ───────────────────────────────────────── */}
      <div className="pt-6">{children}</div>
    </div>
  );
}
