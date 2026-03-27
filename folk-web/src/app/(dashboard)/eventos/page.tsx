"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Cookies from "js-cookie";
import { decodeJwt } from "@/lib/jwt";
import { useEventos, useCrearEvento } from "@/features/eventos/hooks";
import type { Evento } from "@/features/eventos/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre: z.string().min(2, "Requerido"),
  fecha: z.string().min(1, "Requerido"),
  ubicacion: z.string().min(2, "Requerido"),
  activo: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition";

// ─── Modal nuevo evento ───────────────────────────────────────────────────────

function NuevoEventoModal({ onClose }: { onClose: () => void }) {
  const crearMutation = useCrearEvento();
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { activo: false },
  });

  const onSubmit = (values: FormValues) => {
    const token = Cookies.get("folk_access");
    const payload = token ? decodeJwt(token) : null;
    if (!payload?.organizador_id) return;
    crearMutation.mutate(
      { ...values, organizador: payload.organizador_id },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Nuevo evento</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Nombre</label>
            <input {...register("nombre")} placeholder="Festival de Salsa 2026" className={inputCls} />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Fecha</label>
            <input {...register("fecha")} type="date" className={inputCls} />
            {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Ubicación</label>
            <input {...register("ubicacion")} placeholder="Teatro Municipal, Guayaquil" className={inputCls} />
            {errors.ubicacion && <p className="text-xs text-red-500 mt-1">{errors.ubicacion.message}</p>}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input {...register("activo")} type="checkbox" className="w-4 h-4 rounded accent-orange-500" />
            <span className="text-sm text-gray-700">Publicar evento inmediatamente</span>
          </label>

          {crearMutation.isError && (
            <p className="text-sm text-red-500">Error al crear el evento. Intenta de nuevo.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={crearMutation.isPending}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm transition shadow-sm shadow-orange-200">
              {crearMutation.isPending ? "Creando…" : "Crear evento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tarjeta de evento ────────────────────────────────────────────────────────

const ESTADO_COLORS: Record<string, string> = {
  borrador:   "bg-gray-100 text-gray-500",
  activa:     "bg-emerald-100 text-emerald-700",
  finalizada: "bg-orange-100 text-orange-700",
};
const ESTADO_LABELS: Record<string, string> = {
  borrador:   "Borrador",
  activa:     "Activo",
  finalizada: "Finalizado",
};

function EventoCard({ evento }: { evento: Evento }) {
  const fecha = new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-EC", {
    year: "numeric", month: "long", day: "numeric",
  });
  return (
    <Link href={`/eventos/${evento.id}`}>
      <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:border-orange-200 hover:shadow-orange-50 transition-all cursor-pointer group">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors leading-snug truncate">
              {evento.nombre}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25" />
              </svg>
              {fecha}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="truncate">{evento.ubicacion}</span>
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold shrink-0 ${ESTADO_COLORS[evento.estado] ?? "bg-gray-100 text-gray-500"}`}>
            {ESTADO_LABELS[evento.estado] ?? evento.estado}
          </span>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${evento.activo ? "text-emerald-600" : "text-gray-400"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${evento.activo ? "bg-emerald-500" : "bg-gray-300"}`} />
            {evento.activo ? "Publicado" : "No publicado"}
          </span>
          <span className="text-xs text-orange-500 font-semibold group-hover:underline">
            Gestionar →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function EventosPage() {
  const { data: eventos, isLoading, isError } = useEventos();
  const [showModal, setShowModal] = useState(false);

  const total     = eventos?.length ?? 0;
  const activos   = eventos?.filter((e) => e.activo).length ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Mis Eventos</h1>
          {total > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              {total} evento{total !== 1 ? "s" : ""} · {activos} publicado{activos !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm shadow-orange-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo evento
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          Error al cargar los eventos. Verifica tu conexión.
        </div>
      )}

      {!isLoading && eventos && eventos.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-orange-100 rounded-2xl">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold mb-1">No hay eventos aún</p>
          <p className="text-gray-400 text-sm mb-4">Crea tu primer evento para comenzar</p>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 transition">
            + Crear primer evento
          </button>
        </div>
      )}

      {eventos && eventos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventos.map((evento) => <EventoCard key={evento.id} evento={evento} />)}
        </div>
      )}

      {showModal && <NuevoEventoModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
