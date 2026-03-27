"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getHomepageEventos, getSiteConfig, type HomepageData, type EventoHomepage, type SiteConfigPublic } from "@/features/portal/api";

const ESTADO_LABELS: Record<string, string> = {
  borrador:   "Borrador",
  activa:     "Activo",
  finalizada: "Finalizado",
};

const ESTADO_COLORS: Record<string, string> = {
  borrador:   "bg-gray-100 text-gray-500",
  activa:     "bg-emerald-100 text-emerald-700",
  finalizada: "bg-orange-100 text-orange-700",
};

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function MesPicker({ meses, selected, onChange }: {
  meses: string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  const porAño = meses.reduce<Record<string, string[]>>((acc, m) => {
    const [año, mes] = m.split("-");
    if (!acc[año]) acc[año] = [];
    acc[año].push(mes);
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-6">
      {Object.entries(porAño).map(([año, mesesDelAño]) => (
        <div key={año} className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-gray-400 mr-1">{año}</span>
          {mesesDelAño.map((m) => {
            const key = `${año}-${m}`;
            const active = selected === key;
            return (
              <button
                key={key}
                onClick={() => onChange(active ? "" : key)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
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

export default function HomePage() {
  const [data, setData]           = useState<HomepageData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [sliderIdx, setSliderIdx] = useState(0);
  const [search, setSearch]       = useState("");
  const [estadoFiltro, setEstado] = useState("");
  const [mesFiltro, setMesFiltro] = useState("");
  const [siteConfig, setSiteConfig] = useState<SiteConfigPublic>({
    whatsapp_numero: "593999999999",
    whatsapp_mensaje: "Hola! Quiero más información sobre Folk.",
  });

  useEffect(() => {
    getHomepageEventos().then(setData).finally(() => setLoading(false));
    getSiteConfig().then(setSiteConfig).catch(() => {/* use defaults */});
  }, []);

  useEffect(() => {
    if (!data?.destacados.length) return;
    const timer = setInterval(() => {
      setSliderIdx((i) => (i + 1) % data.destacados.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [data]);

  const eventos = useMemo(() => data?.eventos ?? [], [data?.eventos]);
  const destacados = useMemo(() => data?.destacados ?? [], [data?.destacados]);
  const current    = destacados[sliderIdx];

  // Meses disponibles derivados de los eventos (únicos, ordenados)
  const mesesDisponibles = useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((ev) => { if (ev.fecha) set.add(ev.fecha.slice(0, 7)); });
    return Array.from(set).sort();
  }, [eventos]);

  const filtrados = useMemo(() => eventos.filter((ev) => {
    if (search       && !ev.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    if (estadoFiltro && ev.estado !== estadoFiltro)  return false;
    if (mesFiltro    && !ev.fecha.startsWith(mesFiltro))                         return false;
    return true;
  }), [eventos, search, estadoFiltro, mesFiltro]);

  const hayFiltros = search || estadoFiltro || mesFiltro;
  const limpiar    = () => { setSearch(""); setEstado(""); setMesFiltro(""); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent select-none">
              Folk
            </span>
          </Link>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/${siteConfig.whatsapp_numero}?text=${encodeURIComponent(siteConfig.whatsapp_mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition"
            >
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl hover:from-orange-600 hover:to-red-700 transition shadow-sm shadow-orange-200"
            >
              Ingresar
            </Link>
          </div>
        </div>
      </nav>

      {/* ── CARRUSEL ─────────────────────────────────────────────────────────── */}
      <div className="pt-16">
        {destacados.length > 0 && current ? (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-orange-100" style={{ aspectRatio: "21/9" }}>
              {current.banner_url ? (
                <img src={current.banner_url} alt={current.nombre}
                  className="absolute inset-0 w-full h-full object-cover object-center" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-red-700 via-orange-600 to-yellow-500" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-transparent" />

              <div className="relative h-full flex flex-col justify-center px-10 max-w-xl py-8">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-orange-300 mb-3">
                  <span className="w-3 h-px bg-orange-400" /> Destacado
                </span>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-2 drop-shadow">
                  {current.nombre}
                </h2>
                <p className="text-gray-300 text-sm mb-1">{current.organizador_nombre}</p>
                <p className="text-gray-400 text-xs mb-5 flex flex-wrap gap-2">
                  <span>{new Date(current.fecha + "T00:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span>·</span>
                  <span>{current.ubicacion}</span>
                </p>
                <Link href={`/evento/${current.slug}`}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-5 py-2.5 rounded-xl hover:from-orange-600 hover:to-red-600 transition shadow-lg text-sm w-fit">
                  Ver evento
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>

              {destacados.length > 1 && (
                <>
                  <button onClick={() => setSliderIdx((i) => (i - 1 + destacados.length) % destacados.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <button onClick={() => setSliderIdx((i) => (i + 1) % destacados.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition backdrop-blur-sm">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {destacados.map((_, i) => (
                      <button key={i} onClick={() => setSliderIdx(i)}
                        className={`transition-all rounded-full ${i === sliderIdx ? "w-5 h-1.5 bg-orange-400" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
            <div className="max-w-7xl mx-auto px-6 py-24 text-center">
              <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                La plataforma de{" "}
                <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
                  concursos de baile
                </span>
              </h1>
              <p className="text-gray-500 text-lg max-w-xl mx-auto">
                Inscripciones, calificaciones y resultados en tiempo real para tu evento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── EVENTOS ──────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="mb-5">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Próximos eventos</h2>
        </div>

        {/* Buscador */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento…"
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-300 transition" />
          </div>

          <select value={estadoFiltro} onChange={(e) => setEstado(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-400 focus:border-orange-300 transition">
            <option value="">Todos</option>
            <option value="activa">Activo</option>
            <option value="finalizada">Finalizado</option>
            <option value="borrador">Borrador</option>
          </select>

          {hayFiltros && (
            <button onClick={limpiar}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-400 hover:text-red-500 transition">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>

        {/* Píldoras de mes */}
        {mesesDisponibles.length > 0 && (
          <MesPicker
            meses={mesesDisponibles}
            selected={mesFiltro}
            onChange={setMesFiltro}
          />
        )}

        {filtrados.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-orange-100 rounded-2xl">
            {hayFiltros ? (
              <>
                <svg className="w-10 h-10 text-orange-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-gray-500 text-sm font-medium">Sin resultados para esa búsqueda</p>
                <button onClick={limpiar} className="mt-3 text-orange-600 text-sm hover:underline">
                  Ver todos los eventos
                </button>
              </>
            ) : (
              <p className="text-gray-400 text-sm">No hay eventos disponibles por el momento.</p>
            )}
          </div>
        ) : (
          <>
            {hayFiltros && <p className="text-xs text-gray-400 mb-4">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtrados.map((ev) => <EventoCard key={ev.id} ev={ev} />)}
            </div>
          </>
        )}
      </section>

      {/* ── SERVICIOS ────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-y border-orange-100 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-2">¿Organizas eventos?</p>
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
              Contrata nuestra plataforma
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
              Folk gestiona todo tu concurso de baile: inscripciones, pagos, calificaciones y resultados en un solo lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                ),
                title: "Inscripciones en línea",
                desc: "Formularios de registro por categorías y modalidades. Validación de participantes y control de pagos.",
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                ),
                title: "Calificaciones digitales",
                desc: "Panel para jueces con criterios personalizados. Resultados calculados automáticamente en tiempo real.",
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                  </svg>
                ),
                title: "Ranking público",
                desc: "Portal público con resultados, agenda y cronograma. Tus participantes consultan su posición en vivo.",
              },
            ].map((s) => (
              <div key={s.title} className="bg-white rounded-2xl border border-orange-100 p-7 hover:shadow-lg hover:shadow-orange-50 transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center text-orange-600 mb-5">
                  {s.icon}
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <a
              href={`https://wa.me/${siteConfig.whatsapp_numero}?text=${encodeURIComponent(siteConfig.whatsapp_mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-lg shadow-green-200 text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Quiero contratar Folk
            </a>
          </div>
        </div>
      </section>

      {/* ── CONTACTO / WHATSAPP CTA ──────────────────────────────────────────── */}
      <section id="contacto" className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 rounded-3xl overflow-hidden shadow-2xl shadow-orange-200 p-10 md:p-16 text-center">
            {/* Decoración de fondo */}
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-white/10 rounded-full" />
            <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-white/10 rounded-full" />

            <p className="relative text-white/80 text-xs font-bold uppercase tracking-widest mb-3">
              ¿Tienes un evento?
            </p>
            <h2 className="relative text-3xl md:text-4xl font-extrabold text-white mb-4 leading-tight">
              Hablemos por WhatsApp
            </h2>
            <p className="relative text-white/80 text-base mb-10 max-w-lg mx-auto">
              Cuéntanos sobre tu competencia y te asesoramos sin compromiso. Respuesta inmediata.
            </p>

            <a
              href={`https://wa.me/${siteConfig.whatsapp_numero}?text=${encodeURIComponent(siteConfig.whatsapp_mensaje)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative inline-flex items-center gap-3 bg-white hover:bg-green-50 text-green-700 font-extrabold text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105"
            >
              {/* Icono WhatsApp */}
              <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Escríbenos ahora
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <span className="font-extrabold text-lg">Folk</span>
            <span className="text-gray-500 text-sm">— Plataforma de concursos de baile</span>
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
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-50 transition-all duration-300">
        <div className="h-44 relative overflow-hidden">
          {ev.banner_url ? (
            <img src={ev.banner_url} alt={ev.nombre}
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {ev.destacado && (
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                Destacado
              </span>
            )}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ESTADO_COLORS[ev.estado] ?? "bg-gray-100 text-gray-500"}`}>
              {ESTADO_LABELS[ev.estado] ?? ev.estado}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h3 className="font-bold text-gray-900 text-base mb-1 group-hover:text-orange-600 transition leading-snug">
            {ev.nombre}
          </h3>
          <p className="text-gray-500 text-xs font-medium mb-3">{ev.organizador_nombre}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0v-7.5" />
              </svg>
              {new Date(ev.fecha + "T00:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="text-gray-200">·</span>
            <span className="flex items-center gap-1 truncate">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
