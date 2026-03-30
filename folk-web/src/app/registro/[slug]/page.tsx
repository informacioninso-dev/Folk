"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { publicApiClient } from "@/lib/public-api-client";
import PrivacyConsent, {
  createPrivacyConsentState,
  validatePrivacyConsent,
} from "@/features/portal/components/PrivacyConsent";


// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface EventoPublico {
  id: number;
  slug: string;
  nombre: string;
  fecha: string;
  ubicacion: string;
  version_politica_privacidad: string;
  politica_privacidad_url: string;
  aviso_privacidad_corto: string;
  contacto_privacidad: string;
}

interface RegistroResult {
  id: number;
  nombre_completo: string;
  estado: string;
}

// â”€â”€â”€ Schema â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const schema = z.object({
  nombre_completo:    z.string().min(2, "Nombre requerido"),
  cedula:             z.string().min(4, "CÃ©dula requerida"),
  edad:               z.coerce.number().int().min(1, "Edad invÃ¡lida").max(120, "Edad invÃ¡lida"),
  correo_electronico: z.string().email("Correo invÃ¡lido"),
  telefono:           z.string().min(7, "TelÃ©fono requerido"),
});

type FormValues = z.infer<typeof schema>;

// â”€â”€â”€ Componente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function RegistroPublicoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [loadingEvento, setLoadingEvento] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [result, setResult] = useState<RegistroResult | null>(null);
  const [serverError, setServerError] = useState("");
  const [privacy, setPrivacy] = useState(createPrivacyConsentState);

  // File upload state
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as Resolver<FormValues> });

  const edad = watch("edad");
  const requiresRepresentative = (typeof edad === "number" && edad < 18) || privacy.es_menor_edad;

  useEffect(() => {
    publicApiClient
      .get<EventoPublico>(`/registro-general/${slug}/`)
      .then((r) => setEvento(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingEvento(false));
  }, [slug]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setFileName(file.name);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "comprobante");
      const { data } = await publicApiClient.post<{ url: string }>("/upload/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedUrl(data.url);
    } catch {
      setUploadError("No se pudo subir el archivo. Intenta de nuevo.");
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    const privacyError = validatePrivacyConsent(privacy, { requiresRepresentative });
    if (privacyError) {
      setServerError(privacyError);
      return;
    }
    try {
      const { data } = await axios.post<RegistroResult>(`/api/proxy/registro-general/${slug}/`,
        { ...values, comprobante_pago_url: uploadedUrl, ...privacy }
      );
      setResult(data);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const raw = err.response.data as Record<string, string | string[]>;
        const msg = Object.values(raw).flat().join(" ");
        setServerError(msg || "Error al procesar el registro.");
      } else {
        setServerError("Error de conexiÃ³n. Intenta de nuevo.");
      }
    }
  };

  // â”€â”€â”€ Estados de carga/error/Ã©xito â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loadingEvento) {
    return (
      <Screen>
        <div className="animate-pulse text-indigo-400 text-sm">Cargando eventoâ€¦</div>
      </Screen>
    );
  }

  if (notFound || !evento) {
    return (
      <Screen>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Evento no encontrado</h1>
          <p className="text-gray-400 text-sm">
            El enlace puede haber expirado o el evento no estÃ¡ activo.
          </p>
        </div>
      </Screen>
    );
  }

  if (result) {
    return (
      <Screen>
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full space-y-4">
          <div className="text-5xl">ðŸ“‹</div>
          <h2 className="text-2xl font-bold text-gray-900">Â¡Registro enviado!</h2>
          <p className="text-gray-500 text-sm">
            Tu comprobante de pago estÃ¡ siendo revisado. RecibirÃ¡s un correo cuando sea aprobado.
          </p>
          <div className="bg-indigo-50 rounded-xl px-6 py-4">
            <p className="text-xs text-indigo-500 uppercase tracking-wide font-medium mb-1">
              NÃºmero de referencia
            </p>
            <p className="text-3xl font-bold text-indigo-700">#{result.id}</p>
            <p className="text-xs text-gray-400 mt-1">
              Guarda este nÃºmero para consultas.
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Se ha enviado una copia a tu correo electrÃ³nico.
          </p>
        </div>
      </Screen>
    );
  }

  const fecha = new Date(evento.fecha + "T12:00:00").toLocaleDateString("es-EC", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wide mb-1">Folk</p>
          <h1 className="text-3xl font-bold text-gray-900">{evento.nombre}</h1>
          <p className="text-gray-500 text-sm mt-1">{fecha} Â· {evento.ubicacion}</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Datos del participante</h2>

          {/* Nombre */}
          <Field label="Nombre completo" error={errors.nombre_completo?.message}>
            <input
              {...register("nombre_completo")}
              placeholder="Ej: MarÃ­a GarcÃ­a"
              className={input()}
            />
          </Field>

          {/* CÃ©dula + Edad */}
          <div className="flex gap-3">
            <Field label="CÃ©dula / Pasaporte" error={errors.cedula?.message} className="flex-1">
              <input {...register("cedula")} placeholder="0912345678" className={input()} />
            </Field>
            <Field label="Edad" error={errors.edad?.message} className="w-24">
              <input {...register("edad")} type="number" placeholder="25" className={input()} />
            </Field>
          </div>

          {/* Correo */}
          <Field label="Correo electrÃ³nico" error={errors.correo_electronico?.message}>
            <input
              {...register("correo_electronico")}
              type="email"
              placeholder="ejemplo@correo.com"
              className={input()}
            />
          </Field>

          {/* TelÃ©fono */}
          <Field label="TelÃ©fono / WhatsApp" error={errors.telefono?.message}>
            <input
              {...register("telefono")}
              type="tel"
              placeholder="+593 99 123 4567"
              className={input()}
            />
          </Field>

          {/* Comprobante de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comprobante de pago
              <span className="text-gray-400 font-normal"> (opcional)</span>
            </label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-300 transition"
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <p className="text-sm text-indigo-400">Subiendoâ€¦</p>
              ) : uploadedUrl ? (
                <div className="space-y-1">
                  <p className="text-sm text-green-600 font-medium">âœ“ Archivo subido</p>
                  <p className="text-xs text-gray-400 truncate">{fileName}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-gray-400">Haz clic para adjuntar</p>
                  <p className="text-xs text-gray-300">PDF, JPG o PNG</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
          </div>

          <PrivacyConsent
            value={privacy}
            onChange={setPrivacy}
            notice={evento.aviso_privacidad_corto}
            policyUrl={evento.politica_privacidad_url}
            version={evento.version_politica_privacidad}
            contactEmail={evento.contacto_privacidad}
            forceRepresentative={requiresRepresentative}
          />

          {serverError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition text-sm"
          >
            {isSubmitting ? "Enviandoâ€¦" : "Registrarme"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Powered by <span className="font-semibold text-indigo-500">Folk</span>
        </p>
      </div>
    </div>
  );
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function input() {
  return "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition";
}


