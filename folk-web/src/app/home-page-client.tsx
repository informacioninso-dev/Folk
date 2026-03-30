"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type {
  EventoHomepage,
  HomepageData,
  SiteConfigPublic,
} from "@/features/portal/api";

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activa: "Activo",
  finalizada: "Finalizado",
};

const ESTADO_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-500",
  activa: "bg-emerald-100 text-emerald-700",
  finalizada: "bg-orange-100 text-orange-700",
};

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function MesPicker({
  meses,
  selected,
  onChange,
}: {
  meses: string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  const porAnio = meses.reduce<Record<string, string[]>>((acc, m) => {
    const [anio, mes] = m.split("-");
    if (!acc[anio]) acc[anio] = [];
    acc[anio].push(mes);
    return acc;
  }, {});

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2">
      {Object.entries(porAnio).map(([anio, mesesDelAnio]) => (
        <div key={anio} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-bold text-gray-400">{anio}</span>
          {mesesDelAnio.map((m) => {
            const key = `${anio}-${m}`;
            const active = selected === key;
            return (
              <button
                key={key}
                onClick={() => onChange(active ? "" : key)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                  active
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600"
                }`}
              >
                {MESES[parseInt(m, 10) - 1]}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function HomePageClient({
  initialData,
  initialSiteConfig,
}: {
  initialData: HomepageData;
  initialSiteConfig: SiteConfigPublic;
}) {
  const [sliderIdx, setSliderIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstado] = useState("");
  const [mesFiltro, setMesFiltro] = useState("");

  const data = initialData;
  const siteConfig = initialSiteConfig;

  useEffect(() => {
    if (!data.destacados.length) return;
    const timer = setInterval(() => {
      setSliderIdx((i) => (i + 1) % data.destacados.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [data.destacados.length]);

  const eventos = useMemo(() => data.eventos ?? [], [data.eventos]);
  const destacados = useMemo(() => data.destacados ?? [], [data.destacados]);
  const current = destacados[sliderIdx];

  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((ev) => {
      if (ev.fecha) set.add(ev.fecha.slice(0, 7));
    });
    return Array.from(set).sort();
  }, [eventos]);

  const filtrados = useMemo(
    () =>
      eventos.filter((ev) => {
        if (search && !ev.nombre.toLowerCase().includes(search.toLowerCase())) return false;
        if (estadoFiltro && ev.estado !== estadoFiltro) return false;
        if (mesFiltro && !ev.fecha.startsWith(mesFiltro)) return false;
        return true;
      }),
    [eventos, search, estadoFiltro, mesFiltro]
  );

  const hayFiltros = search || estadoFiltro || mesFiltro;
  const limpiar = () => {
    setSearch("");
    setEstado("");
    setMesFiltro("");
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-md">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="select-none bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
              Folk
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${siteConfig.whatsapp_numero}?text=${encodeURIComponent(siteConfig.whatsapp_mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 sm:inline-flex"
            >
              <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-orange-200 transition hover:from-orange-600 hover:to-red-700"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-16">
        {destacados.length > 0 && current ? (
          <div className="mx-auto max-w-7xl px-6 py-8">
            <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-orange-100" style={{ aspectRatio: "21/9" }}>
              {current.banner_url ? (
                <img src={current.banner_url} alt={current.nombre} className="absolute inset-0 h-full w-full object-cover object-center" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-orange-600 to-yellow-500" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />

              <div className="relative flex h-full max-w-xl flex-col justify-center px-10 py-8">
                <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-orange-300">
                  <span className="h-px w-3 bg-orange-400" />
                  Destacado
                </span>
                <h2 className="mb-2 text-2xl font-extrabold leading-tight text-white drop-shadow md:text-4xl">
                  {current.nombre}
                </h2>
                <p className="mb-1 text-sm text-gray-300">{current.organizador_nombre}</p>
                <p className="mb-5 flex flex-wrap gap-2 text-xs text-gray-400">
                  <span>{new Date(`${current.fecha}T00:00:00`).toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span>.</span>
                  <span>{current.ubicacion}</span>
                </p>
                <Link
                  href={`/evento/${current.slug}`}
                  className="inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-red-600"
                >
                  Ver evento
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>

              {destacados.length > 1 && (
                <>
                  <button
                    onClick={() => setSliderIdx((i) => (i - 1 + destacados.length) % destacados.length)}
                    className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSliderIdx((i) => (i + 1) % destacados.length)}
                    className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {destacados.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setSliderIdx(i)}
                        className={`rounded-full transition-all ${i === sliderIdx ? "h-1.5 w-5 bg-orange-400" : "h-1.5 w-1.5 bg-white/40 hover:bg-white/70"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
            <div className="mx-auto max-w-7xl px-6 py-24 text-center">
              <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-gray-900">
                La plataforma de{" "}
                <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                  concursos de baile.
                </span>
              </h1>
              <p className="mx-auto max-w-xl text-lg text-gray-500">
                Inscripciones, calificaciones y resultados en tiempo real para tu evento.
              </p>
            </div>
          </div>
        )}
      </div>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-5">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Proximos eventos</h2>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <svg className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento..."
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 transition focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
          </div>

          <select
            value={estadoFiltro}
            onChange={(e) => setEstado(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 transition focus:border-orange-300 focus:outline-none focus:ring-1 focus:ring-orange-400"
          >
            <option value="">Todos</option>
            <option value="activa">Activo</option>
            <option value="finalizada">Finalizado</option>
            <option value="borrador">Borrador</option>
          </select>

          {hayFiltros && (
            <button onClick={limpiar} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 transition hover:text-red-500">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>

        {mesesDisponibles.length > 0 && (
          <MesPicker meses={mesesDisponibles} selected={mesFiltro} onChange={setMesFiltro} />
        )}

        {filtrados.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-orange-100 py-20 text-center">
            {hayFiltros ? (
              <>
                <svg className="mx-auto mb-3 h-10 w-10 text-orange-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-sm font-medium text-gray-500">Sin resultados para esa busqueda</p>
                <button onClick={limpiar} className="mt-3 text-sm text-orange-600 hover:underline">
                  Ver todos los eventos.
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">No hay eventos disponibles por el momento.</p>
            )}
          </div>
        ) : (
          <>
            {hayFiltros && (
              <p className="mb-4 text-xs text-gray-400">
                {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((ev) => (
                <EventoCard key={ev.id} ev={ev} />
              ))}
            </div>
          </>
        )}
      </section>

      <section className="border-y border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-600">Organizas eventos?</p>
            <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl">
              Contrata nuestra plataforma.
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-gray-500">
              Folk gestiona todo tu concurso de baile: inscripciones, pagos, calificaciones y resultados en un solo lugar.
            </p>
          </div>

          <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                ),
                title: "Inscripciones en linea",
                desc: "Formularios de registro por categorias y modalidades. Validacion de participantes y control de pagos.",
              },
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                ),
                title: "Calificaciones digitales",
                desc: "Panel para jueces con criterios personalizados. Resultados calculados automaticamente en tiempo real.",
              },
              {
                icon: (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                  </svg>
                ),
                title: "Ranking publico",
                desc: "Portal publico con resultados, agenda y cronograma. Tus participantes consultan su posicion en vivo.",
              },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-orange-100 bg-white p-7 transition-shadow hover:shadow-lg hover:shadow-orange-50">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600">
                  {s.icon}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">{s.title}</h3>
                <p className="text-sm leading-relaxed text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a
              href={`https://wa.me/${siteConfig.whatsapp_numero}?text=${encodeURIComponent(siteConfig.whatsapp_mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl bg-green-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-green-200 transition hover:bg-green-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Quiero contratar Folk.
            </a>
          </div>
        </div>
      </section>

      <section id="contacto" className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 p-10 text-center shadow-2xl shadow-orange-200 md:p-16">
            <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" />
            <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10" />

            <p className="relative mb-3 text-xs font-bold uppercase tracking-widest text-white/80">
              Tienes un evento?
            </p>
            <h2 className="relative mb-4 text-3xl font-extrabold leading-tight text-white md:text-4xl">
              Hablemos por WhatsApp.
            </h2>
            <p className="relative mx-auto mb-10 max-w-lg text-base text-white/80">
              Cuentanos sobre tu competencia y te asesoramos sin compromiso. Respuesta inmediata.
            </p>

            <a
              href={`https://wa.me/${siteConfig.whatsapp_numero}?text=${encodeURIComponent(siteConfig.whatsapp_mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-extrabold text-green-700 shadow-xl transition-all duration-200 hover:scale-105 hover:bg-green-50 hover:shadow-2xl"
            >
              <svg className="h-7 w-7 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Escribenos ahora.
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="text-lg font-extrabold">Folk</span>
            <span className="text-sm text-gray-500">Plataforma de concursos de baile</span>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} Folk. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function EventoCard({ ev }: { ev: EventoHomepage }) {
  return (
    <Link href={`/evento/${ev.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-50">
        <div className="relative h-44 overflow-hidden">
          {ev.banner_url ? (
            <img
              src={ev.banner_url}
              alt={ev.nombre}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500">
              <svg className="h-12 w-12 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {ev.destacado && (
              <span className="rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                Destacado
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_COLORS[ev.estado] ?? "bg-gray-100 text-gray-500"}`}>
              {ESTADO_LABELS[ev.estado] ?? ev.estado}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="mb-1 text-base font-bold leading-snug text-gray-900 transition group-hover:text-orange-600">
            {ev.nombre}
          </h3>
          <p className="mb-3 text-xs font-medium text-gray-500">{ev.organizador_nombre}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0v-7.5" />
              </svg>
              {new Date(`${ev.fecha}T00:00:00`).toLocaleDateString("es-EC", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-gray-200">.</span>
            <span className="flex items-center gap-1 truncate">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="truncate">{ev.ubicacion}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
