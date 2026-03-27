"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  agendaGeneradorApi,
  bloquesHorarioApi,
  ordenRitmoAgendaApi,
  categoriasApi,
} from "@/features/eventos/api";
import type { BloqueHorario, CategoriaRitmo, OrdenRitmoAgenda } from "@/features/eventos/types";

type Modo = "horarios" | "orden_ritmo" | "manual";

export default function AgendaGeneradorPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const [modo, setModo] = useState<Modo | null>(null);
  const [categorias, setCategorias] = useState<CategoriaRitmo[]>([]);

  // Modo 1 — bloques horarios
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [nuevoBloqueForm, setNuevoBloqueForm] = useState({
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    orden: 1,
  });
  const [duracionMin, setDuracionMin] = useState(10);

  // Modo 2 — orden ritmos
  const [ordenes, setOrdenes] = useState<OrdenRitmoAgenda[]>([]);
  const [nuevoOrdenForm, setNuevoOrdenForm] = useState({ ritmo: "", modalidad: "solista", orden: 1 });

  // Modo 3 — manual
  const [manualForm, setManualForm] = useState({
    inscripcion_id: "",
    titulo: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
  });

  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    categoriasApi.list(eventoId).then(setCategorias);
    bloquesHorarioApi.list(eventoId).then(setBloques);
    ordenRitmoAgendaApi.list(eventoId).then(setOrdenes);
  }, [eventoId]);

  const ritmos = Array.from(new Set(categorias.map((c) => c.nombre_ritmo)));

  async function agregarBloque() {
    const bloque = await bloquesHorarioApi.create({
      evento: eventoId,
      ...nuevoBloqueForm,
    });
    setBloques((b) => [...b, bloque]);
    setNuevoBloqueForm({ fecha: "", hora_inicio: "", hora_fin: "", orden: bloques.length + 2 });
  }

  async function eliminarBloque(id: number) {
    await bloquesHorarioApi.delete(id);
    setBloques((b) => b.filter((x) => x.id !== id));
  }

  async function agregarOrden() {
    const ord = await ordenRitmoAgendaApi.create({
      evento: eventoId,
      ...nuevoOrdenForm,
    });
    setOrdenes((o) => [...o, ord]);
    setNuevoOrdenForm({ ritmo: "", modalidad: "solista", orden: ordenes.length + 2 });
  }

  async function eliminarOrden(id: number) {
    await ordenRitmoAgendaApi.delete(id);
    setOrdenes((o) => o.filter((x) => x.id !== id));
  }

  async function generar() {
    if (!modo) return;
    setGenerando(true);
    setResultado(null);
    setError("");
    try {
      let extra: Record<string, unknown> = {};
      if (modo === "horarios") extra = { duracion_minutos: duracionMin };
      if (modo === "manual") extra = { ...manualForm, inscripcion_id: Number(manualForm.inscripcion_id) || undefined };

      const res = await agendaGeneradorApi.generar(eventoId, modo, extra);
      if (modo === "manual") {
        setResultado("Item agregado correctamente.");
      } else {
        setResultado(
          `Agenda generada: ${res.items_creados} items creados.${
            res.inscripciones_sin_asignar
              ? ` (${res.inscripciones_sin_asignar} inscripciones sin asignar por falta de tiempo)`
              : ""
          }`
        );
      }
    } catch {
      setError("Error al generar la agenda.");
    } finally {
      setGenerando(false);
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Generador de agenda</h2>
        <p className="text-sm text-gray-500">
          Elige un modo para generar automáticamente el cronograma del evento.
        </p>
      </div>

      {/* Selección de modo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ModoCard
          title="Por horarios"
          desc="El sistema distribuye participantes en los bloques de tiempo que configures"
          icon="🗓"
          active={modo === "horarios"}
          onClick={() => setModo("horarios")}
        />
        <ModoCard
          title="Por orden de ritmos"
          desc="Defines el orden de ritmos y modalidades y el sistema los organiza"
          icon="🎵"
          active={modo === "orden_ritmo"}
          onClick={() => setModo("orden_ritmo")}
        />
        <ModoCard
          title="Manual"
          desc="Agrega items uno a uno eligiendo ritmo, modalidad y participante"
          icon="✍️"
          active={modo === "manual"}
          onClick={() => setModo("manual")}
        />
      </div>

      {/* ── Modo 1: Horarios ────────────────────────────────────────────────── */}
      {modo === "horarios" && (
        <div className="space-y-5">
          <h3 className="font-semibold text-gray-800">Bloques horarios del evento</h3>

          {bloques.length > 0 && (
            <div className="space-y-2">
              {bloques.map((b) => (
                <div key={b.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-700">
                    {b.fecha} · {b.hora_inicio}–{b.hora_fin}
                  </span>
                  <button
                    onClick={() => eliminarBloque(b.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              type="date"
              value={nuevoBloqueForm.fecha}
              onChange={(e) => setNuevoBloqueForm({ ...nuevoBloqueForm, fecha: e.target.value })}
              className={inputCls}
            />
            <input
              type="time"
              value={nuevoBloqueForm.hora_inicio}
              onChange={(e) => setNuevoBloqueForm({ ...nuevoBloqueForm, hora_inicio: e.target.value })}
              className={inputCls}
            />
            <input
              type="time"
              value={nuevoBloqueForm.hora_fin}
              onChange={(e) => setNuevoBloqueForm({ ...nuevoBloqueForm, hora_fin: e.target.value })}
              className={inputCls}
            />
            <button
              onClick={agregarBloque}
              disabled={!nuevoBloqueForm.fecha || !nuevoBloqueForm.hora_inicio || !nuevoBloqueForm.hora_fin}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            >
              + Agregar
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Duración por participación (minutos)</label>
            <input
              type="number"
              min={1}
              value={duracionMin}
              onChange={(e) => setDuracionMin(Number(e.target.value))}
              className={`${inputCls} w-32`}
            />
          </div>
        </div>
      )}

      {/* ── Modo 2: Orden de ritmos ─────────────────────────────────────────── */}
      {modo === "orden_ritmo" && (
        <div className="space-y-5">
          <h3 className="font-semibold text-gray-800">Orden de ritmos y modalidades</h3>

          {ordenes.length > 0 && (
            <div className="space-y-2">
              {ordenes
                .sort((a, b) => a.orden - b.orden)
                .map((o) => (
                  <div key={o.id} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    <span className="text-sm text-gray-700">
                      #{o.orden} · {o.ritmo} — <span className="capitalize">{o.modalidad}</span>
                    </span>
                    <button
                      onClick={() => eliminarOrden(o.id)}
                      className="text-red-400 hover:text-red-600 text-xs"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={nuevoOrdenForm.ritmo}
              onChange={(e) => setNuevoOrdenForm({ ...nuevoOrdenForm, ritmo: e.target.value })}
              className={inputCls}
            >
              <option value="">Seleccionar ritmo</option>
              {ritmos.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              value={nuevoOrdenForm.modalidad}
              onChange={(e) => setNuevoOrdenForm({ ...nuevoOrdenForm, modalidad: e.target.value })}
              className={inputCls}
            >
              <option value="solista">Solista</option>
              <option value="pareja">Pareja</option>
              <option value="grupo">Grupo</option>
            </select>
            <button
              onClick={agregarOrden}
              disabled={!nuevoOrdenForm.ritmo}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40"
            >
              + Agregar
            </button>
          </div>
        </div>
      )}

      {/* ── Modo 3: Manual ─────────────────────────────────────────────────── */}
      {modo === "manual" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Agregar item manualmente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">ID de inscripción (opcional)</label>
              <input
                type="number"
                value={manualForm.inscripcion_id}
                onChange={(e) => setManualForm({ ...manualForm, inscripcion_id: e.target.value })}
                className={inputCls}
                placeholder="ID de la inscripción"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Título</label>
              <input
                value={manualForm.titulo}
                onChange={(e) => setManualForm({ ...manualForm, titulo: e.target.value })}
                className={inputCls}
                placeholder="Nombre del item"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Fecha (opcional)</label>
              <input
                type="date"
                value={manualForm.fecha}
                onChange={(e) => setManualForm({ ...manualForm, fecha: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Hora inicio</label>
                <input
                  type="time"
                  value={manualForm.hora_inicio}
                  onChange={(e) => setManualForm({ ...manualForm, hora_inicio: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5">Hora fin</label>
                <input
                  type="time"
                  value={manualForm.hora_fin}
                  onChange={(e) => setManualForm({ ...manualForm, hora_fin: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón generar */}
      {modo && (
        <div className="flex items-center gap-4">
          <button
            onClick={generar}
            disabled={generando}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {generando
              ? "Generando..."
              : modo === "manual"
              ? "Agregar item"
              : "Generar agenda"}
          </button>
          {resultado && <p className="text-green-600 text-sm">{resultado}</p>}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 text-sm focus:outline-none focus:border-indigo-500";

function ModoCard({
  title,
  desc,
  icon,
  active,
  onClick,
}: {
  title: string;
  desc: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-2xl border-2 transition ${
        active
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <span className="text-3xl">{icon}</span>
      <p className={`font-bold mt-3 mb-1 ${active ? "text-indigo-700" : "text-gray-900"}`}>
        {title}
      </p>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </button>
  );
}
