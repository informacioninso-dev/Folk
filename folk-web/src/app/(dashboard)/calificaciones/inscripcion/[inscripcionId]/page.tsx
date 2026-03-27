"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useInscripcion, useCategoria } from "@/features/eventos/hooks";
import {
  useCriterios,
  useMisJueces,
  useCalificaciones,
  useSaveCalificacion,
  useUploadAudioCalificacion,
} from "@/features/calificaciones/hooks";
import type { CriterioEvaluacion, Calificacion } from "@/features/calificaciones/types";

interface ScoreRow {
  criterio: CriterioEvaluacion;
  puntaje: string;
  comentario: string;
}

// ─── AudioRecorder ─────────────────────────────────────────────────────────────

function AudioRecorder({
  calificacion,
  onUploaded,
}: {
  calificacion: Calificacion | undefined;
  onUploaded: (url: string) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const upload = useUploadAudioCalificacion();

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    mr.onstop = () => {
      const b = new Blob(chunksRef.current, { type: "audio/webm" });
      setBlob(b);
      stream.getTracks().forEach((t) => t.stop());
    };
    mediaRef.current = mr;
    mr.start();
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    setRecording(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!blob || !calificacion) return;
    const file = new File([blob], "feedback.webm", { type: "audio/webm" });
    upload.mutate(
      { id: calificacion.id, file },
      { onSuccess: (updated) => { setBlob(null); onUploaded(updated.feedback_audio_url); } }
    );
  }, [blob, calificacion, upload, onUploaded]);

  if (!calificacion) return null;

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      {calificacion.feedback_audio_url && !blob && (
        <audio controls src={calificacion.feedback_audio_url} className="h-8 max-w-xs" />
      )}
      {!recording && !blob && (
        <button
          type="button"
          onClick={start}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition"
        >
          🎙 Grabar feedback
        </button>
      )}
      {recording && (
        <button
          type="button"
          onClick={stop}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 border border-red-300 rounded-lg transition animate-pulse"
        >
          ■ Detener
        </button>
      )}
      {blob && !recording && (
        <>
          <audio controls src={URL.createObjectURL(blob)} className="h-8 max-w-xs" />
          <button
            type="button"
            onClick={handleSave}
            disabled={upload.isPending}
            className="px-2.5 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 border border-green-300 rounded-lg transition disabled:opacity-50"
          >
            {upload.isPending ? "Subiendo…" : "Guardar audio"}
          </button>
          <button
            type="button"
            onClick={() => setBlob(null)}
            className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Descartar
          </button>
        </>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function CalificarInscripcionPage() {
  const params = useParams();
  const router = useRouter();
  const inscripcionId = Number(params.inscripcionId);

  const { data: inscripcion, isLoading: loadingIns } = useInscripcion(inscripcionId);
  const categoriaId = inscripcion?.categoria_ritmo ?? 0;
  const { data: categoria } = useCategoria(categoriaId);
  const eventoId = categoria?.evento ?? 0;

  const { data: criterios, isLoading: loadingCriterios } = useCriterios(eventoId);
  const { data: misJueces } = useMisJueces();

  const juez = misJueces?.find((j) => j.evento === eventoId);
  const juezId = juez?.id;

  const { data: existentes, isLoading: loadingExistentes } = useCalificaciones(
    juezId && inscripcionId ? { juez: juezId, inscripcion: inscripcionId } : {}
  );

  const saveMutation = useSaveCalificacion();
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [saved, setSaved] = useState(false);

  const allBloqueadas = existentes?.length
    ? existentes.every((c) => c.bloqueada)
    : false;

  useEffect(() => {
    if (!criterios) return;
    setRows(
      criterios.map((c) => {
        const existente = existentes?.find((e) => e.criterio === c.id);
        return {
          criterio: c,
          puntaje: existente ? existente.puntaje : "",
          comentario: existente ? existente.comentario : "",
        };
      })
    );
  }, [criterios, existentes]);

  const handleChange = (idx: number, field: "puntaje" | "comentario", value: string) => {
    if (allBloqueadas) return;
    setRows((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!juezId || allBloqueadas) return;

    const promises = rows.map((row) => {
      const puntaje = parseFloat(row.puntaje);
      if (isNaN(puntaje)) return Promise.resolve();
      const existente = existentes?.find((e) => e.criterio === row.criterio.id);
      return saveMutation.mutateAsync({
        existing: existente,
        payload: {
          juez: juezId,
          inscripcion: inscripcionId,
          criterio: row.criterio.id,
          puntaje: puntaje.toFixed(2),
          comentario: row.comentario,
        },
      });
    });

    await Promise.all(promises);
    setSaved(true);
    setTimeout(() => router.push(`/calificaciones/evento/${eventoId}`), 1200);
  };

  const totalScore = useMemo(() => {
    const vals = rows.map((r) => parseFloat(r.puntaje)).filter((v) => !isNaN(v));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0);
  }, [rows]);

  const filledCount = rows.filter((r) => r.puntaje !== "").length;
  const isLoading = loadingIns || loadingCriterios || loadingExistentes;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-5 bg-gray-200 rounded w-1/4" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!inscripcion) return <p className="text-gray-500">Inscripción no encontrada.</p>;

  if (!juezId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-5 text-sm">
        No estás registrado como juez en este evento. Contacta al organizador.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href={`/calificaciones/evento/${eventoId}`} className="text-sm text-indigo-600 hover:underline mb-1 inline-block">
          ← Volver al evento
        </Link>
        <div className="flex items-start gap-3 flex-wrap mt-1">
          <h1 className="text-2xl font-bold text-gray-900">{inscripcion.nombre_acto}</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium self-center ${
            inscripcion.estado_pago ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}>
            {inscripcion.estado_pago ? "Pagado" : "Pago pendiente"}
          </span>
          {allBloqueadas && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium self-center bg-gray-100 text-gray-600">
              🔒 Calificación bloqueada
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {inscripcion.participantes.map((p) => p.nombre_completo).join(", ")}
        </p>
      </div>

      {allBloqueadas && (
        <div className="bg-gray-50 border border-gray-200 text-gray-600 rounded-xl px-4 py-3 text-sm">
          Esta calificación ha sido bloqueada por el organizador y ya no puede modificarse.
        </div>
      )}

      {saved ? (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-4 text-sm font-medium">
          ✓ Calificación guardada. Redirigiendo…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {rows.length === 0 && (
            <p className="text-gray-400 text-sm">No hay criterios de evaluación definidos para este evento.</p>
          )}

          {rows.map((row, idx) => {
            const existente = existentes?.find((e) => e.criterio === row.criterio.id);
            return (
              <div
                key={row.criterio.id}
                className={`bg-white border rounded-xl p-5 space-y-3 ${allBloqueadas ? "border-gray-100 opacity-75" : "border-gray-200"}`}
              >
                <p className="font-semibold text-gray-800">{row.criterio.nombre}</p>

                <div className="flex gap-4 items-start">
                  <div className="w-32">
                    <label className="block text-xs text-gray-500 mb-1">Puntaje (0–100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      readOnly={allBloqueadas}
                      value={row.puntaje}
                      onChange={(e) => handleChange(idx, "puntaje", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition read-only:bg-gray-50 read-only:cursor-not-allowed"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Comentario (opcional)</label>
                    <input
                      type="text"
                      readOnly={allBloqueadas}
                      value={row.comentario}
                      onChange={(e) => handleChange(idx, "comentario", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition read-only:bg-gray-50 read-only:cursor-not-allowed"
                      placeholder="Observación…"
                    />
                  </div>
                </div>

                {/* Audio feedback — solo si la calificación ya fue guardada */}
                {existente && (
                  <AudioRecorder
                    calificacion={existente}
                    onUploaded={() => {}}
                  />
                )}
              </div>
            );
          })}

          {rows.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {filledCount}/{rows.length} criterios completados
              </span>
              {totalScore !== null && (
                <span className="text-sm font-semibold text-indigo-700">
                  Total: {totalScore.toFixed(2)} pts
                </span>
              )}
            </div>
          )}

          {rows.length > 0 && !allBloqueadas && (
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition text-sm"
            >
              {saveMutation.isPending ? "Guardando…" : "Guardar calificación"}
            </button>
          )}

          {saveMutation.isError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              Error al guardar. Verifica los valores e intenta de nuevo.
            </div>
          )}
        </form>
      )}
    </div>
  );
}
