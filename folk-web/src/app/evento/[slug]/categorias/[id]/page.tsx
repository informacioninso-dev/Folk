"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { publicApiClient } from "@/lib/public-api-client";
import {
  getCategoriasPortal,
  getEventoPortal,
  submitCategoriaPortal,
  type CategoriaRitmo,
  type EventoPortal,
  type InscripcionExistente,
} from "@/features/portal/api";
import PrivacyConsent, {
  createPrivacyConsentState,
  validatePrivacyConsent,
} from "@/features/portal/components/PrivacyConsent";


// â”€â”€â”€ Tipos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface FpInfo {
  nombre_completo?: string;
  estado: string;
}

// â”€â”€â”€ Hook: verificar Full Pass de una cÃ©dula â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function useFpLookup(slug: string) {
  const cache = useRef<Record<string, FpInfo | null>>({});

  return useCallback(
    async (cedula: string): Promise<FpInfo | null> => {
      const key = cedula.trim();
      if (key.length < 6) return null;
      if (key in cache.current) return cache.current[key];
      try {
        const { data } = await publicApiClient.get<FpInfo | null>(
          `/portal/${slug}/full-pass/`,
          { params: { cedula: key } }
        );
        const result = data && data.estado === "aprobado" ? data : null;
        cache.current[key] = result;
        return result;
      } catch {
        return null;
      }
    },
    [slug]
  );
}

// â”€â”€â”€ Componente: input de cÃ©dula con verificaciÃ³n de FP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CedulaVerificadaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onVerificado: (ok: boolean, nombre?: string) => void;
  slug: string;
  disabled?: boolean;
  locked?: boolean;
  lockedNombre?: string;
}

function CedulaVerificada({
  label, value, onChange, onVerificado, slug, disabled, locked, lockedNombre
}: CedulaVerificadaProps) {
  const buscar = useFpLookup(slug);
  const [estado, setEstado] = useState<"idle" | "buscando" | "ok" | "no_fp" | "no_aprobado">("idle");
  const [nombre, setNombre] = useState(lockedNombre ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (locked) { setEstado("ok"); onVerificado(true, lockedNombre); return; }
    if (value.trim().length < 6) {
      setEstado("idle"); setNombre(""); onVerificado(false); return;
    }
    setEstado("buscando");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const fp = await buscar(value.trim());
      if (fp) {
        setEstado("ok");
        setNombre(fp.nombre_completo ?? "");
        onVerificado(true, fp.nombre_completo);
      } else {
        setEstado("no_fp");
        setNombre("");
        onVerificado(false);
      }
    }, 500);
    return () => clearTimeout(timer.current);
  }, [value, buscar, locked, lockedNombre, onVerificado]);

  const borderClass =
    estado === "ok"
      ? "border-green-500 focus:ring-green-500/30"
      : estado === "no_fp" || estado === "no_aprobado"
      ? "border-red-500 focus:ring-red-500/30"
      : "border-white/10 focus:ring-indigo-500/30";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => !locked && onChange(e.target.value)}
          readOnly={locked || disabled}
          placeholder={locked ? "" : "CÃ©dula / Pasaporte"}
          className={`w-full px-3 py-2.5 bg-gray-800 border rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition ${borderClass} ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
        />
        {locked && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">tÃº</span>
        )}
      </div>
      {estado === "buscando" && <p className="text-xs text-gray-400 mt-1">Verificando Full Passâ€¦</p>}
      {estado === "ok" && nombre && (
        <p className="text-xs text-green-400 mt-1">âœ“ {nombre} â€” Full Pass aprobado</p>
      )}
      {estado === "no_fp" && (
        <p className="text-xs text-red-400 mt-1">
          Sin Full Pass aprobado. Este participante debe pagar y tener su Full Pass aprobado primero.
        </p>
      )}
    </div>
  );
}

// â”€â”€â”€ Componente: upload de archivo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FileUpload({
  label, optional, kind, onUrl,
}: {
  label: string;
  optional?: boolean;
  kind: "photo" | "audio" | "comprobante";
  onUrl: (url: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [done,      setDone]      = useState(false);
  const [fileName,  setFileName]  = useState("");
  const [err,       setErr]       = useState("");
  const accept =
    kind === "photo"
      ? ".jpg,.jpeg,.png,.webp"
      : kind === "audio"
      ? ".mp3,.wav,.m4a,.ogg"
      : ".pdf,.jpg,.jpeg,.png,.webp";

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setFileName(file.name); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const { data } = await publicApiClient.post<{ url: string }>("/upload/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUrl(data.url); setDone(true);
    } catch {
      setErr("No se pudo subir el archivo."); setFileName("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label} {optional && <span className="text-gray-500 font-normal">(opcional)</span>}
      </label>
      <div
        className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500 transition"
        onClick={() => ref.current?.click()}
      >
        {uploading ? (
          <p className="text-sm text-indigo-400">Subiendoâ€¦</p>
        ) : done ? (
          <div>
            <p className="text-sm text-green-400 font-medium">âœ“ Subido</p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{fileName}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Haz clic para adjuntar archivo</p>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
    </div>
  );
}

// â”€â”€â”€ Constantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MODALIDAD_LABELS: Record<string, string> = {
  solista: "Solista", pareja: "Pareja", grupo: "Grupo",
};

const ESTADO_CONFIG: Record<string, { label: string; cls: string }> = {
  aprobada:  { label: "Aprobada",         cls: "bg-green-900/40 text-green-400 border-green-500/30" },
  pendiente: { label: "Pend. validaciÃ³n", cls: "bg-yellow-900/40 text-yellow-400 border-yellow-500/30" },
  rechazada: { label: "Rechazada",        cls: "bg-red-900/40 text-red-400 border-red-500/30" },
};

// â”€â”€â”€ PÃ¡gina principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function InscribirseCategoriPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const searchParams = useSearchParams();
  const cedula      = searchParams.get("cedula") ?? "";
  const categoriaId = Number(id);

  // Datos del evento
  const [categoria,        setCategoria]        = useState<CategoriaRitmo | null>(null);
  const [evento,           setEvento]           = useState<EventoPortal | null>(null);
  const [yaInscrito,       setYaInscrito]        = useState<InscripcionExistente | null>(null);
  const [loading,          setLoading]           = useState(true);
  const [accesoDenegado,   setAccesoDenegado]    = useState(false);

  // Nombre del acto/pareja/grupo
  const [nombreActo,       setNombreActo]        = useState("");

  // Academia
  const [academia,         setAcademia]          = useState("");

  // Pareja: miembro 2
  const [cedula2,          setCedula2]           = useState("");
  const [fp2Ok,            setFp2Ok]             = useState(false);

  // Grupo: miembros adicionales (miembro 1 = tÃº, ya locked)
  const [miembros,         setMiembros]          = useState<string[]>(["", ""]);  // 2 inputs = 3 total con el tuyo
  const [miembrosOk,       setMiembrosOk]        = useState<boolean[]>([false, false]);

  // Archivos
  const [fotoUrl,          setFotoUrl]           = useState("");
  const [pistaUrl,         setPistaUrl]          = useState("");
  const [comprobanteUrl,   setComprobanteUrl]    = useState("");

  // Estado del envÃ­o
  const [submitting,       setSubmitting]        = useState(false);
  const [error,            setError]             = useState("");
  const [success,          setSuccess]           = useState(false);
  const [privacy,          setPrivacy]           = useState(createPrivacyConsentState);

  // â”€â”€ Carga inicial â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    getEventoPortal(slug).then(setEvento).catch(() => null);
  }, [slug]);

  useEffect(() => {
    if (!cedula || cedula.length < 6) {
      setAccesoDenegado(true);
      setLoading(false);
      return;
    }
    getCategoriasPortal(slug, cedula)
      .then((res) => {
        if (res.full_pass_estado !== "aprobado") {
          setAccesoDenegado(true);
          return;
        }
        const cat = res.categorias.find((c) => c.id === categoriaId);
        if (!cat) { setAccesoDenegado(true); return; }
        setCategoria(cat);
        const existente = res.inscripciones_existentes.find(
          (i) => i.categoria_ritmo_id === categoriaId
        );
        if (existente) setYaInscrito(existente);
      })
      .catch(() => setAccesoDenegado(true))
      .finally(() => setLoading(false));
  }, [slug, cedula, categoriaId]);

  // â”€â”€ Helpers grupo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const updateMiembro = useCallback((idx: number, val: string) => {
    setMiembros((p) => p.map((v, i) => (i === idx ? val : v)));
  }, []);

  const updateMiembroOk = useCallback((idx: number, ok: boolean) => {
    setMiembrosOk((p) => p.map((v, i) => (i === idx ? ok : v)));
  }, []);

  const addMiembro = () => {
    setMiembros((p) => [...p, ""]);
    setMiembrosOk((p) => [...p, false]);
  };

  const removeMiembro = (idx: number) => {
    if (miembros.length <= 2) return;
    setMiembros((p) => p.filter((_, i) => i !== idx));
    setMiembrosOk((p) => p.filter((_, i) => i !== idx));
  };

  // â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoria) return;

    const modalidad = categoria.modalidad;

    if (modalidad === "pareja" && !fp2Ok) {
      setError("Verifica la cÃ©dula del segundo participante â€” debe tener Full Pass aprobado.");
      return;
    }
    if (modalidad === "grupo") {
      const nOk = miembrosOk.filter(Boolean).length;
      if (nOk < miembros.length) {
        setError("Todos los miembros del grupo deben tener Full Pass aprobado.");
        return;
      }
    }
    if (!categoria.incluido_full_pass && !comprobanteUrl) {
      setError("Debes adjuntar el comprobante de pago de esta categorÃ­a.");
      return;
    }

    const privacyError = validatePrivacyConsent(privacy);
    if (privacyError) {
      setError(privacyError);
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const cedulas_grupo = modalidad === "grupo"
        ? [cedula, ...miembros.filter((c) => c.trim())]
        : undefined;

      await submitCategoriaPortal(slug, {
        cedula,
        categoria_ritmo: categoria.id,
        nombre_acto:     nombreActo.trim() || undefined,
        academia:        academia.trim() || undefined,
        foto_url:        fotoUrl || undefined,
        pista_musical_url:         pistaUrl || undefined,
        comprobante_categoria_url: comprobanteUrl || undefined,
        acepta_politica_privacidad: privacy.acepta_politica_privacidad,
        es_menor_edad: privacy.es_menor_edad || undefined,
        acepta_como_representante_legal: privacy.acepta_como_representante_legal || undefined,
        nombre_representante_legal: privacy.nombre_representante_legal || undefined,
        cedula_representante_legal: privacy.cedula_representante_legal || undefined,
        ...(modalidad === "pareja" && { cedula_2: cedula2 }),
        ...(modalidad === "grupo"  && { cedulas: cedulas_grupo }),
      });
      setSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const raw = err.response.data as Record<string, string | string[]>;
        setError(Object.values(raw).flat().join(" "));
      } else {
        setError("Error de conexiÃ³n. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // â”€â”€ Renders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Cargandoâ€¦
      </div>
    );
  }

  if (accesoDenegado || !categoria) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-400 text-center">
          {!cedula || cedula.length < 6
            ? "Debes consultar desde la pÃ¡gina de categorÃ­as con tu cÃ©dula."
            : "Esta categorÃ­a no estÃ¡ disponible o no tienes acceso."}
        </p>
        <Link
          href={`/evento/${slug}/categorias${cedula ? `?cedula=${cedula}` : ""}`}
          className="text-indigo-400 hover:underline text-sm"
        >
          â† Volver a categorÃ­as
        </Link>
      </div>
    );
  }

  // Ya inscrito en esta categorÃ­a â€” mostrar estado
  if (yaInscrito) {
    const est = ESTADO_CONFIG[yaInscrito.estado];
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <Link
              href={`/evento/${slug}/categorias?cedula=${cedula}`}
              className="text-gray-400 hover:text-white text-sm transition"
            >
              â† Volver a categorÃ­as
            </Link>
          </div>
        </nav>
        <div className="max-w-2xl mx-auto px-4 pt-24 pb-16 flex flex-col items-center gap-6">
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center max-w-sm space-y-4 w-full">
            <p className="text-4xl">âœ…</p>
            <h2 className="text-lg font-bold">{categoria.nombre_ritmo} â€” {MODALIDAD_LABELS[categoria.modalidad]}</h2>
            <p className="text-sm text-gray-400">Ya estÃ¡s inscrito en esta categorÃ­a.</p>
            <div className="bg-gray-800 rounded-xl px-4 py-3 space-y-1 text-sm">
              <p className="text-white font-semibold">{yaInscrito.nombre_acto}</p>
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border ${est?.cls ?? ""}`}>
                {est?.label ?? yaInscrito.estado}
              </span>
            </div>
            <Link
              href={`/evento/${slug}/categorias?cedula=${cedula}`}
              className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition text-center"
            >
              Ver todas mis inscripciones
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de Ã©xito
  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-white/10 rounded-2xl p-8 text-center max-w-sm space-y-4">
          <p className="text-5xl">Ã°Å¸Å½â€°</p>
          <h2 className="text-xl font-bold">Â¡InscripciÃ³n registrada!</h2>
          <p className="text-sm text-gray-400">
            {categoria.incluido_full_pass
              ? "Tu inscripciÃ³n fue aprobada automÃ¡ticamente â€” estÃ¡ incluida en tu Full Pass."
              : "Tu inscripciÃ³n fue enviada y estÃ¡ pendiente de validaciÃ³n por el organizador."}
          </p>
          <Link
            href={`/evento/${slug}/categorias?cedula=${cedula}`}
            className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold py-2.5 rounded-xl transition text-center"
          >
            Ver mis inscripciones
          </Link>
        </div>
      </div>
    );
  }

  // â”€â”€ Formulario principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const modalidad    = categoria.modalidad;
  const precioParsed = parseFloat(categoria.precio_adicional);
  const nombrePlaceholder =
    modalidad === "solista"
      ? "Tu nombre artÃ­stico (opcional)"
      : modalidad === "pareja"
      ? "Ej: Los Reyes del Ritmo (opcional)"
      : "Ej: Academia Salsa Brava (opcional)";

  const totalMiembros = 1 + miembros.length; // tÃº + miembros adicionales

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <Link
            href={`/evento/${slug}/categorias?cedula=${cedula}`}
            className="text-gray-400 hover:text-white text-sm transition"
          >
            â† Volver a categorÃ­as
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-16">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-900/50 text-indigo-300 border border-indigo-500/20">
              {MODALIDAD_LABELS[modalidad]}
            </span>
            {categoria.incluido_full_pass ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-500/20">
                Incluido en Full Pass
              </span>
            ) : precioParsed > 0 ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-white/10">
                ${precioParsed.toFixed(2)} adicional
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold">{categoria.nombre_ritmo}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {modalidad === "solista"
              ? "Modalidad individual"
              : modalidad === "pareja"
              ? "Participa en pareja â€” el compaÃ±ero debe tener Full Pass aprobado"
              : `Participa en grupo â€” mÃ­nimo 3 miembros, todos con Full Pass aprobado (${totalMiembros} actualmente)`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* â”€â”€ Nombre del acto â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
              {modalidad === "solista" ? "Tu acto" : modalidad === "pareja" ? "Tu pareja" : "Tu grupo"}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Nombre{" "}
                <span className="text-gray-500 font-normal">
                  (si no lo pones, se asigna uno automÃ¡ticamente)
                </span>
              </label>
              <input
                value={nombreActo}
                onChange={(e) => setNombreActo(e.target.value)}
                placeholder={nombrePlaceholder}
                maxLength={150}
                className="w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Academia <span className="text-gray-500 font-normal">(opcional)</span>
              </label>
              <input
                value={academia}
                onChange={(e) => setAcademia(e.target.value)}
                placeholder="Nombre de la academia"
                className="w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {modalidad !== "solista" && (
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                Participantes
              </h2>

              <CedulaVerificada
                label="Miembro 1 (tu)"
                value={cedula}
                onChange={() => {}}
                onVerificado={() => {}}
                slug={slug}
                locked
                lockedNombre=""
              />

              {modalidad === "pareja" && (
                <CedulaVerificada
                  label="Miembro 2 *"
                  value={cedula2}
                  onChange={setCedula2}
                  onVerificado={(ok) => setFp2Ok(ok)}
                  slug={slug}
                />
              )}

              {modalidad === "grupo" && (
                <>
                  {miembros.map((ced, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1">
                        <CedulaVerificada
                          label={`Miembro ${idx + 2} *`}
                          value={ced}
                          onChange={(v) => updateMiembro(idx, v)}
                          onVerificado={(ok) => updateMiembroOk(idx, ok)}
                          slug={slug}
                        />
                      </div>
                      {miembros.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeMiembro(idx)}
                          className="mt-8 text-red-400 hover:text-red-300 text-sm px-1"
                          title="Eliminar miembro"
                        >
                          x
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMiembro}
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition"
                  >
                    + Agregar miembro
                  </button>
                  <p className="text-xs text-gray-500">
                    Total del grupo: {totalMiembros} miembro{totalMiembros !== 1 ? "s" : ""} (minimo 3)
                  </p>
                </>
              )}
            </div>
          )}

          <div className="bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Archivos</h2>

            <FileUpload label="Foto del acto" optional kind="photo" onUrl={setFotoUrl} />
            <FileUpload label="Pista musical" optional kind="audio" onUrl={setPistaUrl} />

            {categoria.incluido_full_pass ? (
              <div className="flex items-center gap-2 bg-green-900/20 border border-green-500/20 rounded-xl px-4 py-3">
                <span className="text-green-400">OK</span>
                <p className="text-sm text-green-400">
                  Esta categoria esta incluida en tu Full Pass y no requiere comprobante adicional.
                </p>
              </div>
            ) : (
              <FileUpload
                label={`Comprobante de pago${precioParsed > 0 ? ` ($${precioParsed.toFixed(2)})` : ""}`}
                kind="comprobante"
                onUrl={setComprobanteUrl}
              />
            )}
          </div>

          {evento && (
            <PrivacyConsent
              value={privacy}
              onChange={setPrivacy}
              notice={evento.aviso_privacidad_corto}
              policyUrl={evento.politica_privacidad_url}
              version={evento.version_politica_privacidad}
              contactEmail={evento.contacto_privacidad}
              theme="dark"
            />
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm"
          >
            {submitting ? "Enviandoâ€¦" : "Inscribirme en esta categorÃ­a"}
          </button>
        </form>
      </div>
    </div>
  );
}


