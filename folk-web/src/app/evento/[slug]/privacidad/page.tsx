"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getEventoPortal, type EventoPortal } from "@/features/portal/api";

export default function PrivacidadEventoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [evento, setEvento] = useState<EventoPortal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEventoPortal(slug)
      .then(setEvento)
      .catch(() => setEvento(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center">
        Cargando politica de privacidad...
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center gap-4 px-6">
        <p>No se pudo cargar la informacion de privacidad de este evento.</p>
        <Link href={`/evento/${slug}`} className="text-indigo-400 hover:text-indigo-300">
          Volver al evento
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-3">
          <Link href={`/evento/${slug}`} className="text-sm text-slate-400 hover:text-white transition">
            ← Volver al evento
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Privacidad</p>
          <h1 className="text-3xl font-bold">{evento.nombre}</h1>
          <p className="text-slate-400">
            Version {evento.version_politica_privacidad}. Responsable del tratamiento:{" "}
            <span className="text-slate-200">{evento.organizador_nombre}</span>.
          </p>
        </div>

        <section className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Resumen</h2>
          <p className="text-slate-300 leading-7">{evento.aviso_privacidad_corto}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Datos tratados</h2>
            <p className="text-sm text-slate-300 leading-6">
              El sistema puede tratar datos de identificacion, contacto, edad, pagos,
              comprobantes, inscripciones, agenda y resultados vinculados a tu participacion.
            </p>
          </article>
          <article className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Finalidades</h2>
            <p className="text-sm text-slate-300 leading-6">
              Usamos esta informacion para gestionar registros, validar pagos,
              administrar categorias, publicar agenda, comunicar novedades y operar el evento.
            </p>
          </article>
          <article className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Conservacion</h2>
            <p className="text-sm text-slate-300 leading-6">
              Los datos se conservan durante la operacion del evento y luego por el tiempo
              necesario para soporte, auditoria, obligaciones legales y defensa ante reclamos.
            </p>
          </article>
          <article className="bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-3">
            <h2 className="text-lg font-semibold">Tus derechos</h2>
            <p className="text-sm text-slate-300 leading-6">
              Puedes solicitar acceso, rectificacion, actualizacion o eliminacion escribiendo a{" "}
              <a
                href={`mailto:${evento.contacto_privacidad}`}
                className="text-indigo-300 hover:text-indigo-200"
              >
                {evento.contacto_privacidad}
              </a>
              .
            </p>
          </article>
        </section>

        <section className="bg-indigo-950/40 border border-indigo-500/20 rounded-3xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Base de consentimiento</h2>
          <p className="text-sm text-slate-200 leading-6">
            Al enviar formularios del portal declaras haber leido este aviso y autorizas el
            tratamiento de datos para la gestion del evento. Si actuas por un menor de edad,
            debes hacerlo como su representante legal.
          </p>
        </section>
      </div>
    </div>
  );
}
