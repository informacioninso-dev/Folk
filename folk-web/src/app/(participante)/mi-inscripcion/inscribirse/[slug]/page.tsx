"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { apiClient } from "@/lib/api-client";

const BASE = process.env.NEXT_PUBLIC_API_URL;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CategoriaPublica {
  id: number;
  nombre_ritmo: string;
  modalidad: "solista" | "pareja" | "grupo";
}

interface EventoPublico {
  id: number;
  nombre: string;
  fecha: string;
  ubicacion: string;
  categorias: CategoriaPublica[];
}

interface ParticipanteEncontrado {
  id: number;
  nombre_completo: string;
  cedula: string;
  edad: number;
}

// ─── Hook: buscar participante por cédula ─────────────────────────────────────

function useCedulaLookup(slug: string) {
  const cache = useRef<Record<string, ParticipanteEncontrado | null>>({});

  const buscar = useCallback(
    async (cedula: string): Promise<ParticipanteEncontrado | null> => {
      if (cedula.length < 4) return null;
      if (cedula in cache.current) return cache.current[cedula];
      const { data } = await axios.get<ParticipanteEncontrado | null>(
        `${BASE}/api/v1/registro-general/${slug}/buscar/`,
        { params: { cedula } }
      );
      cache.current[cedula] = data;
      return data;
    },
    [slug]
  );

  return buscar;
}

// ─── Componente: input de cédula con validación ───────────────────────────────

interface CedulaInputProps {
  label: string;
  slug: string;
  value: string;
  onChange: (v: string) => void;
  onParticipante: (p: ParticipanteEncontrado | null) => void;
}

function CedulaInput({ label, slug, value, onChange, onParticipante }: CedulaInputProps) {
  const buscar = useCedulaLookup(slug);
  const [estado, setEstado] = useState<"idle" | "buscando" | "encontrado" | "no_encontrado">("idle");
  const [nombre, setNombre] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (value.length < 4) {
      setEstado("idle");
      setNombre("");
      onParticipante(null);
      return;
    }
    setEstado("buscando");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const pg = await buscar(value);
      if (pg) {
        setEstado("encontrado");
        setNombre(pg.nombre_completo);
        onParticipante(pg);
      } else {
        setEstado("no_encontrado");
        setNombre("");
        onParticipante(null);
      }
    }, 500);
    return () => clearTimeout(timer.current);
  }, [value, buscar, onParticipante]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Cédula / Pasaporte"
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition ${
          estado === "encontrado"
            ? "border-green-400 focus:ring-green-300"
            : estado === "no_encontrado"
            ? "border-red-400 focus:ring-red-300"
            : "border-gray-300 focus:ring-indigo-400"
        }`}
      />
      {estado === "buscando" && <p className="text-xs text-gray-400 mt-1">Buscando…</p>}
      {estado === "encontrado" && (
        <p className="text-xs text-green-600 mt-1">✓ {nombre}</p>
      )}
      {estado === "no_encontrado" && (
        <p className="text-xs text-red-500 mt-1">No se encontró un participante aprobado con esa cédula.</p>
      )}
    </div>
  );
}

// ─── Componente: upload de archivo ───────────────────────────────────────────

interface FileUploadProps {
  label: string;
  optional?: boolean;
  onUrl: (url: string) => void;
}

function FileUpload({ label, optional, onUrl }: FileUploadProps) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileName(file.name);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await axios.post<{ url: string }>(`${BASE}/api/v1/upload/`, fd);
      onUrl(data.url);
      setDone(true);
    } catch {
      setError("No se pudo subir el archivo.");
      setFileName("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {optional && <span className="text-gray-400 font-normal">(opcional)</span>}
      </label>
      <div
        className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-indigo-300 transition"
        onClick={() => ref.current?.click()}
      >
        {uploading ? (
          <p className="text-sm text-indigo-400">Subiendo…</p>
        ) : done ? (
          <div>
            <p className="text-sm text-green-600 font-medium">✓ Subido</p>
            <p className="text-xs text-gray-400 truncate">{fileName}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Haz clic para adjuntar</p>
        )}
      </div>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.mp3,.wav" className="hidden" onChange={handleChange} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function InscribirseModalidadPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();

  const [evento, setEvento]             = useState<EventoPublico | null>(null);
  const [loadingEvento, setLoadingEvento] = useState(true);
  const [notFound, setNotFound]         = useState(false);

  // Form state
  const [categoriaId, setCategoriaId]       = useState<number | "">("");
  const [nombreActo, setNombreActo]         = useState("");
  const [academia, setAcademia]             = useState("");
  const [fotoUrl, setFotoUrl]               = useState("");
  const [pistaUrl, setPistaUrl]             = useState("");
  const [comprobanteUrl, setComprobanteUrl] = useState("");

  // Pareja
  const [cedula1, setCedula1] = useState("");
  const [pg1, setPg1]         = useState<ParticipanteEncontrado | null>(null);
  const [cedula2, setCedula2] = useState("");
  const [pg2, setPg2]         = useState<ParticipanteEncontrado | null>(null);

  // Grupo
  const [cedulas, setCedulas]           = useState<string[]>(["", "", ""]);
  const [pgs, setPgs]                   = useState<(ParticipanteEncontrado | null)[]>([null, null, null]);
  const [representante, setRepresentante]       = useState("");
  const [cedulaRep, setCedulaRep]               = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(false);

  const categoria = evento?.categorias.find((c) => c.id === categoriaId);
  const modalidad = categoria?.modalidad;

  useEffect(() => {
    axios
      .get<EventoPublico>(`${BASE}/api/v1/registro-general/${slug}/`)
      .then((r) => setEvento(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingEvento(false));
  }, [slug]);

  const updateCedulaGrupo = useCallback((idx: number, val: string) => {
    setCedulas((prev) => prev.map((c, i) => (i === idx ? val : c)));
  }, []);

  const updatePgGrupo = useCallback((idx: number, pg: ParticipanteEncontrado | null) => {
    setPgs((prev) => prev.map((p, i) => (i === idx ? pg : p)));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaId || !nombreActo.trim()) {
      setError("Completa todos los campos requeridos.");
      return;
    }
    setError("");
    setSubmitting(true);

    const body: Record<string, unknown> = {
      categoria_ritmo: categoriaId,
      nombre_acto: nombreActo,
      academia,
      foto_url: fotoUrl,
      pista_musical_url: pistaUrl,
      comprobante_categoria_url: comprobanteUrl,
    };

    if (modalidad === "pareja") {
      if (!pg1 || !pg2) { setError("Verifica las cédulas de los dos participantes."); setSubmitting(false); return; }
      Object.assign(body, { cedula_1: cedula1, cedula_2: cedula2, representante, cedula_representante: cedulaRep });
    } else if (modalidad === "grupo") {
      const cedulasValidas = cedulas.filter((c) => c.trim());
      const pgsValidos     = pgs.filter(Boolean);
      if (pgsValidos.length < 3) { setError("Se requieren al menos 3 participantes aprobados."); setSubmitting(false); return; }
      Object.assign(body, { cedulas: cedulasValidas, representante, cedula_representante: cedulaRep });
    }

    try {
      await apiClient.post(`/registro-general/${slug}/inscribir/`, body);
      setSuccess(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const raw = err.response.data as Record<string, string | string[]>;
        setError(Object.values(raw).flat().join(" "));
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Renders ───────────────────────────────────────────────────────────────

  if (loadingEvento) return <Loading />;
  if (notFound || !evento) return <NotFound />;

  if (success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-gray-900">¡Inscripción registrada!</h2>
          <p className="text-sm text-gray-500">
            Tu inscripción fue enviada y está pendiente de validación por el organizador.
          </p>
          <button
            onClick={() => router.push("/mi-inscripcion")}
            className="w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Volver a mis inscripciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => router.back()} className="text-sm text-indigo-600 hover:underline mb-1">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{evento.nombre}</h1>
        <p className="text-sm text-gray-500">Inscripción en modalidad</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="">Selecciona una categoría…</option>
            {evento.categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre_ritmo} — {MODALIDAD_LABEL[cat.modalidad]}
              </option>
            ))}
          </select>
          {modalidad && (
            <p className="text-xs text-indigo-500 mt-1">
              Modalidad: <strong className="capitalize">{MODALIDAD_LABEL[modalidad]}</strong>
            </p>
          )}
        </div>

        {/* Nombre del acto */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del acto *</label>
          <input
            value={nombreActo}
            onChange={(e) => setNombreActo(e.target.value)}
            placeholder="Ej: Los Torbellinos"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Academia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Academia <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            value={academia}
            onChange={(e) => setAcademia(e.target.value)}
            placeholder="Nombre de la academia"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* ─── Participantes según modalidad ─────────────────────────────── */}

        {modalidad === "solista" && (
          <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
            Esta modalidad es para un solo participante. Tu cédula registrada será la del acto.
          </div>
        )}

        {modalidad === "pareja" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Participantes de la pareja</p>
            <CedulaInput label="Cédula participante 1" slug={slug} value={cedula1} onChange={setCedula1} onParticipante={setPg1} />
            <CedulaInput label="Cédula participante 2" slug={slug} value={cedula2} onChange={setCedula2} onParticipante={setPg2} />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Representante</label>
                <input value={representante} onChange={(e) => setRepresentante(e.target.value)} placeholder="Nombre" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula representante</label>
                <input value={cedulaRep} onChange={(e) => setCedulaRep(e.target.value)} placeholder="Cédula" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
          </div>
        )}

        {modalidad === "grupo" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Participantes del grupo</p>
              <button
                type="button"
                onClick={() => { setCedulas((p) => [...p, ""]); setPgs((p) => [...p, null]); }}
                className="text-xs text-indigo-600 hover:underline"
              >
                + Agregar
              </button>
            </div>
            {cedulas.map((c, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-1">
                  <CedulaInput
                    label={`Participante ${idx + 1}`}
                    slug={slug}
                    value={c}
                    onChange={(v) => updateCedulaGrupo(idx, v)}
                    onParticipante={(pg) => updatePgGrupo(idx, pg)}
                  />
                </div>
                {cedulas.length > 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCedulas((p) => p.filter((_, i) => i !== idx));
                      setPgs((p) => p.filter((_, i) => i !== idx));
                    }}
                    className="mt-6 text-red-400 hover:text-red-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Representante</label>
                <input value={representante} onChange={(e) => setRepresentante(e.target.value)} placeholder="Nombre" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula representante</label>
                <input value={cedulaRep} onChange={(e) => setCedulaRep(e.target.value)} placeholder="Cédula" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
          </div>
        )}

        {/* ─── Archivos ────────────────────────────────────────────────────── */}

        {modalidad && (
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <p className="text-sm font-medium text-gray-700">Archivos</p>
            <FileUpload label="Foto del acto" optional onUrl={setFotoUrl} />
            <FileUpload label="Pista musical" optional onUrl={setPistaUrl} />
            <FileUpload label="Comprobante de categoría" optional onUrl={setComprobanteUrl} />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !categoriaId || !nombreActo.trim()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition text-sm"
        >
          {submitting ? "Enviando…" : "Inscribirme en esta modalidad"}
        </button>
      </form>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MODALIDAD_LABEL: Record<string, string> = {
  solista: "Solista",
  pareja:  "Pareja",
  grupo:   "Grupo",
};

function Loading() {
  return (
    <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
      Cargando…
    </div>
  );
}

function NotFound() {
  return (
    <div className="text-center py-24">
      <h1 className="text-xl font-bold text-gray-700">Evento no encontrado</h1>
      <p className="text-gray-400 text-sm mt-1">El enlace puede haber expirado.</p>
    </div>
  );
}
