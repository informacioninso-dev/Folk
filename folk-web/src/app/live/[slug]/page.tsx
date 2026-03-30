"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { publicApiClient } from "@/lib/public-api-client";


// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ItemLive {
  id: number;
  orden: number;
  titulo: string;
  responsable: string;
  descripcion: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  duracion_min: number;
  inscripcion: number | null;
  nombre_acto: string | null;
  duracion_segundos: number;
  tiempo_extra: number;
}

interface CronogramaLiveData {
  evento: { id: number; nombre: string; slug: string };
  cronograma_id: number;
  items: ItemLive[];
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function itemTitle(item: ItemLive): string {
  if (item.titulo) return item.titulo;
  if (item.nombre_acto) return item.nombre_acto;
  return `InscripciÃ³n #${item.inscripcion}`;
}

function itemDuracion(item: ItemLive): number {
  if (item.duracion_min > 0) return Math.round(item.duracion_min * 60);
  if (item.duracion_segundos > 0) return item.duracion_segundos + item.tiempo_extra;
  return 0;
}

function formatHora(t: string | null): string {
  if (!t) return "";
  return t.slice(0, 5);
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function LivePage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData]       = useState<CronogramaLiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [currentIdx, setCurrentIdx]   = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning]         = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    publicApiClient
      .get<CronogramaLiveData>(`/cronograma-live/${slug}/`)
      .then((r) => {
        setData(r.data);
        if (r.data.items.length > 0) {
          setSecondsLeft(itemDuracion(r.data.items[0]));
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { stopTimer(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  const goToItem = useCallback((idx: number) => {
    stopTimer();
    const items = data?.items;
    if (!items || idx < 0 || idx >= items.length) return;
    setCurrentIdx(idx);
    setSecondsLeft(itemDuracion(items[idx]));
  }, [data, stopTimer]);

  const handleTiempoExtra = useCallback(async () => {
    const item = data?.items[currentIdx];
    if (!item) return;
    try {
      await publicApiClient.post(`/items-cronograma/${item.id}/tiempo-extra/`, { segundos: 30 });
    } catch { /* ignore */ }
    setSecondsLeft(prev => prev + 30);
  }, [data, currentIdx]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // â”€â”€ Estados de carga â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="animate-pulse text-gray-400">Cargandoâ€¦</p>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Evento no encontrado o sin cronograma activo.</p>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <p className="text-2xl font-bold text-white mb-2">{data.evento.nombre}</p>
        <p className="text-gray-500 text-sm">La agenda no tiene actividades aÃºn.</p>
      </div>
    );
  }

  // â”€â”€ Render principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const total       = data.items.length;
  const currentItem = data.items[currentIdx];
  const isLast      = currentIdx >= total - 1;
  const durTotal    = itemDuracion(currentItem);
  const progress    = durTotal > 0 ? Math.max(0, Math.min(1, secondsLeft / durTotal)) : 0;
  const hasDur      = durTotal > 0;

  const timerColor = secondsLeft === 0
    ? "text-red-400"
    : secondsLeft <= 10
    ? "text-orange-400"
    : "text-green-400";

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8 text-white">
      <div className="w-full max-w-xl space-y-6">

        {/* Nombre del evento */}
        <p className="text-center text-gray-500 text-xs uppercase tracking-widest">
          {data.evento.nombre}
        </p>

        {/* Tarjeta de actividad actual */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            {currentIdx + 1} / {total}
          </p>

          {/* Horas si existen */}
          {(currentItem.hora_inicio || currentItem.hora_fin) && (
            <p className="text-indigo-400 text-sm font-mono">
              {formatHora(currentItem.hora_inicio)}
              {currentItem.hora_inicio && currentItem.hora_fin && " â†’ "}
              {formatHora(currentItem.hora_fin)}
            </p>
          )}

          {/* TÃ­tulo */}
          <h1 className="text-3xl font-bold text-white leading-tight">
            {itemTitle(currentItem)}
          </h1>

          {/* Responsable */}
          {currentItem.responsable && (
            <p className="text-indigo-300 text-sm">{currentItem.responsable}</p>
          )}

          {/* DescripciÃ³n */}
          {currentItem.descripcion && (
            <p className="text-gray-400 text-sm">{currentItem.descripcion}</p>
          )}

          {/* Barra + Timer (solo si hay duraciÃ³n) */}
          {hasDur && (
            <>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    secondsLeft === 0 ? "bg-red-500"
                    : secondsLeft <= 10 ? "bg-orange-500"
                    : "bg-green-500"
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className={`text-7xl font-mono font-bold tabular-nums ${timerColor}`}>
                {fmt(secondsLeft)}
              </p>
              {secondsLeft === 0 && (
                <p className="text-red-400 text-sm font-medium animate-pulse">Â¡Tiempo!</p>
              )}
            </>
          )}
        </div>

        {/* Controles */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => goToItem(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-sm rounded-xl transition"
          >
            â† Anterior
          </button>

          {hasDur && (
            <>
              {!running ? (
                <button
                  onClick={startTimer}
                  disabled={secondsLeft === 0}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition"
                >
                  â–¶ Iniciar
                </button>
              ) : (
                <button
                  onClick={stopTimer}
                  className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-xl transition"
                >
                  â¸ Pausar
                </button>
              )}
              <button
                onClick={handleTiempoExtra}
                className="px-4 py-2 bg-blue-800 hover:bg-blue-700 text-white text-sm rounded-xl transition"
              >
                +30s
              </button>
            </>
          )}

          <button
            onClick={() => goToItem(currentIdx + 1)}
            disabled={isLast}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-sm rounded-xl transition"
          >
            Siguiente â†’
          </button>
        </div>

        {/* Cola de actividades */}
        {total > 1 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Agenda</p>
            {data.items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => goToItem(idx)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition flex items-center gap-3 ${
                  idx === currentIdx
                    ? "bg-indigo-900 text-indigo-200 font-semibold"
                    : idx < currentIdx
                    ? "bg-gray-900/50 text-gray-600"
                    : "bg-gray-900 text-gray-400 hover:bg-gray-800"
                }`}
              >
                <span className="font-mono text-xs text-gray-600 w-5 shrink-0">{item.orden}</span>
                <span className="flex-1 truncate">{itemTitle(item)}</span>
                {item.hora_inicio && (
                  <span className="text-xs font-mono text-gray-600 shrink-0">
                    {formatHora(item.hora_inicio)}
                  </span>
                )}
                {item.duracion_min > 0 && !item.hora_inicio && (
                  <span className="text-xs text-gray-600 shrink-0">{item.duracion_min}m</span>
                )}
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}


