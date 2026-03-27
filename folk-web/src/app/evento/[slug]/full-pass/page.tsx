"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getEventoPortal,
  getFullPassEstado,
  submitFullPass,
  type EventoPortal,
  type PagoFullPassEstado,
} from "@/features/portal/api";
import PrivacyConsent, {
  createPrivacyConsentState,
  validatePrivacyConsent,
} from "@/features/portal/components/PrivacyConsent";

const ESTADO_LABELS: Record<string, { label: string; bg: string; text: string; desc: string }> = {
  pendiente: {
    label: "Pendiente de revisión",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
    desc: "Tu comprobante está siendo revisado por el organizador.",
  },
  aprobado: {
    label: "Full Pass aprobado",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
    desc: "Ya puedes registrar tus categorías.",
  },
  rechazado: {
    label: "Rechazado",
    bg: "bg-red-50 border-red-200",
    text: "text-red-700",
    desc: "Tu comprobante fue rechazado. Puedes enviarlo nuevamente.",
  },
};

export default function FullPassPage() {
  const { slug } = useParams<{ slug: string }>();
  const [evento, setEvento] = useState<EventoPortal | null>(null);
  const [cedula, setCedula] = useState("");
  const [estado, setEstado] = useState<PagoFullPassEstado | null>(null);
  const [buscando, setBuscando] = useState(false);

  const [form, setForm] = useState({
    nombre_completo: "",
    correo_electronico: "",
    telefono: "",
    numero_comprobante: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState("");
  const [privacy, setPrivacy] = useState(createPrivacyConsentState);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getEventoPortal(slug).then(setEvento).catch(() => null);
  }, [slug]);

  async function buscarEstado() {
    if (cedula.length < 6) return;
    setBuscando(true);
    try {
      const data = await getFullPassEstado(slug, cedula);
      setEstado(data);
    } finally {
      setBuscando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file && !form.numero_comprobante) {
      setError("Debes subir el comprobante o ingresar el número de transacción.");
      return;
    }
    const privacyError = validatePrivacyConsent(privacy);
    if (privacyError) {
      setError(privacyError);
      return;
    }
    setError("");
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("cedula", cedula);
      fd.append("nombre_completo", form.nombre_completo);
      fd.append("correo_electronico", form.correo_electronico);
      fd.append("telefono", form.telefono);
      fd.append("numero_comprobante", form.numero_comprobante);
      fd.append("acepta_politica_privacidad", String(privacy.acepta_politica_privacidad));
      fd.append("es_menor_edad", String(privacy.es_menor_edad));
      fd.append(
        "acepta_como_representante_legal",
        String(privacy.acepta_como_representante_legal)
      );
      fd.append("nombre_representante_legal", privacy.nombre_representante_legal);
      fd.append("cedula_representante_legal", privacy.cedula_representante_legal);
      if (file) fd.append("comprobante_imagen", file);
      await submitFullPass(slug, fd);
      setExito(true);
      setEstado({ estado: "pendiente" });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { cedula?: string[] } } };
      const msg = axiosErr?.response?.data?.cedula?.[0] || "Error al enviar. Intenta nuevamente.";
      setError(msg);
    } finally {
      setEnviando(false);
    }
  }

  const fp = evento?.full_pass;
  const infoEstado = estado ? ESTADO_LABELS[estado.estado] : null;
  const puedeEnviar = !estado || estado.estado === "rechazado";

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-3">
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
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-1">
            {evento?.nombre ?? "Evento"}
          </p>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {fp?.nombre ?? "Full Pass"}
          </h1>
        </div>

        {/* Precio */}
        {fp && (
          <div className="bg-indigo-600 rounded-2xl p-6 mb-8 flex items-center justify-between text-white shadow-lg shadow-indigo-200">
            <div>
              <p className="text-indigo-200 text-sm mb-1">Valor a pagar</p>
              <p className="text-4xl font-extrabold">${parseFloat(fp.precio).toFixed(2)}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
            </div>
          </div>
        )}

        {/* Buscar cédula */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 shadow-sm">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Consulta o registra tu pago
          </label>
          <div className="flex gap-2">
            <input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscarEstado()}
              placeholder="Número de cédula"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
            />
            <button
              onClick={buscarEstado}
              disabled={buscando || cedula.length < 6}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              {buscando ? "Buscando…" : "Consultar"}
            </button>
          </div>
        </div>

        {/* Estado actual */}
        {estado && infoEstado && (
          <div className={`rounded-2xl border p-5 mb-6 ${infoEstado.bg}`}>
            <p className={`font-bold text-base ${infoEstado.text}`}>{infoEstado.label}</p>
            <p className="text-gray-500 text-sm mt-1">{infoEstado.desc}</p>
          </div>
        )}

        {/* Ir a categorías si aprobado */}
        {estado?.estado === "aprobado" && (
          <Link
            href={`/evento/${slug}/categorias?cedula=${cedula}`}
            className="flex items-center justify-center gap-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-sm"
          >
            Registrar mis categorías
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        )}

        {/* Formulario */}
        {puedeEnviar && cedula.length >= 6 && !exito && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">
              {estado?.estado === "rechazado" ? "Reenviar comprobante" : "Registrar pago"}
            </h2>

            <Field label="Nombre completo" required>
              <input
                value={form.nombre_completo}
                onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                required
                className={inputCls}
                placeholder="Tu nombre completo"
              />
            </Field>

            <Field label="Correo electrónico" required>
              <input
                type="email"
                value={form.correo_electronico}
                onChange={(e) => setForm({ ...form, correo_electronico: e.target.value })}
                required
                className={inputCls}
                placeholder="correo@ejemplo.com"
              />
            </Field>

            <Field label="Teléfono (opcional)">
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className={inputCls}
                placeholder="0999999999"
              />
            </Field>

            <Field label="Número de transacción / comprobante">
              <input
                value={form.numero_comprobante}
                onChange={(e) => setForm({ ...form, numero_comprobante: e.target.value })}
                className={inputCls}
                placeholder="Ej: 123456789"
              />
            </Field>

            <Field label="Subir comprobante (imagen)">
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition"
              >
                {file ? (
                  <p className="text-emerald-600 text-sm font-medium">{file.name}</p>
                ) : (
                  <div>
                    <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-gray-400 text-sm">Haz clic para subir tu comprobante</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Field>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            {evento && (
              <PrivacyConsent
                value={privacy}
                onChange={setPrivacy}
                notice={evento.aviso_privacidad_corto}
                policyUrl={evento.politica_privacidad_url}
                version={evento.version_politica_privacidad}
                contactEmail={evento.contacto_privacidad}
              />
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm transition"
            >
              {enviando ? "Enviando…" : "Enviar comprobante"}
            </button>
          </form>
        )}

        {exito && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="font-bold text-lg text-emerald-800">¡Comprobante enviado!</p>
            <p className="text-emerald-600 text-sm mt-1">
              El organizador revisará tu pago. Vuelve más tarde para consultar el estado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
