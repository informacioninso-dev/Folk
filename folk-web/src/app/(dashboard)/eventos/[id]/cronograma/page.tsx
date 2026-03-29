"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useEvento } from "@/features/eventos/hooks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemCronograma {
  id: number;
  orden: number;
  titulo: string;
  responsable: string;
  descripcion: string;
  hora_inicio: string | null; // "HH:MM:SS"
  hora_fin: string | null;
  duracion_min: number;
}

interface Cronograma {
  id: number;
  evento: number;
  items: ItemCronograma[];
}

interface ItemForm {
  titulo: string;
  responsable: string;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  duracion_min: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const getCronograma = (eventoId: number) =>
  apiClient.get<Cronograma[]>("/cronogramas/", { params: { evento: eventoId } })
    .then(r => r.data[0] ?? null);

const crearCronograma = (eventoId: number) =>
  apiClient.post<Cronograma>("/cronogramas/", { evento: eventoId }).then(r => r.data);

const crearItem = (data: Partial<ItemCronograma> & { cronograma: number }) =>
  apiClient.post<ItemCronograma>("/items-cronograma/", data).then(r => r.data);

const actualizarItem = (id: number, data: Partial<ItemCronograma>) =>
  apiClient.patch<ItemCronograma>(`/items-cronograma/${id}/`, data).then(r => r.data);

const eliminarItem = (id: number) =>
  apiClient.delete(`/items-cronograma/${id}/`);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(base: string, mins: number): string {
  const total = timeToMinutes(base) + Math.round(mins);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function diffMinutes(start: string, end: string): number {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

function formatTime(t: string | null): string {
  if (!t) return "—";
  return t.slice(0, 5); // "HH:MM"
}

// ─── Fila de item ─────────────────────────────────────────────────────────────

function FilaItem({
  item,
  onEdit,
}: {
  item: ItemCronograma;
  onEdit: (item: ItemCronograma) => void;
}) {
  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: () => eliminarItem(item.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cronograma"] }),
  });

  return (
    <div className="flex items-start gap-2 sm:gap-4 px-3 sm:px-4 py-3 sm:py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 group transition-colors">
      {/* Orden */}
      <span className="text-sm font-bold text-gray-300 w-5 pt-0.5 shrink-0">{item.orden}</span>

      {/* Horas */}
      <div className="text-xs text-gray-500 w-16 sm:w-24 shrink-0 pt-0.5 space-y-0.5">
        {item.hora_inicio && (
          <p className="font-mono">
            {formatTime(item.hora_inicio)}
            {item.hora_fin && <> → {formatTime(item.hora_fin)}</>}
          </p>
        )}
        {item.duracion_min > 0 && (
          <p className="text-gray-400">{item.duracion_min} min</p>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{item.titulo || <span className="text-gray-400 italic">Sin título</span>}</p>
        {item.responsable && <p className="text-xs text-indigo-600 mt-0.5">{item.responsable}</p>}
        {item.descripcion && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.descripcion}</p>}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => { if (confirm("¿Eliminar este item?")) deleteMutation.mutate(); }}
          disabled={deleteMutation.isPending}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

// ─── Formulario de item ───────────────────────────────────────────────────────

function FormItem({
  cronogramaId,
  nextOrden,
  editItem,
  onDone,
}: {
  cronogramaId: number;
  nextOrden: number;
  editItem: ItemCronograma | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ItemForm>({
    titulo: "", responsable: "", descripcion: "",
    hora_inicio: "", hora_fin: "", duracion_min: "",
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        titulo:       editItem.titulo       ?? "",
        responsable:  editItem.responsable  ?? "",
        descripcion:  editItem.descripcion  ?? "",
        hora_inicio:  editItem.hora_inicio  ? editItem.hora_inicio.slice(0, 5) : "",
        hora_fin:     editItem.hora_fin     ? editItem.hora_fin.slice(0, 5)    : "",
        duracion_min: editItem.duracion_min ? String(editItem.duracion_min)    : "",
      });
    } else {
      setForm({ titulo: "", responsable: "", descripcion: "", hora_inicio: "", hora_fin: "", duracion_min: "" });
    }
  }, [editItem]);

  const mutation = useMutation({
    mutationFn: (payload: object) =>
      editItem
        ? actualizarItem(editItem.id, payload as Partial<ItemCronograma>)
        : crearItem({ ...payload as Partial<ItemCronograma>, cronograma: cronogramaId, orden: nextOrden }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cronograma"] });
      onDone();
    },
  });

  const set = (k: keyof ItemForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Cuando cambia hora_inicio + duracion → calcula hora_fin
  const handleDuracionChange = (v: string) => {
    set("duracion_min", v);
    if (form.hora_inicio && v) {
      set("hora_fin", minutesToTime(form.hora_inicio, parseFloat(v)));
    }
  };

  // Cuando cambia hora_fin → calcula duracion
  const handleHoraFinChange = (v: string) => {
    set("hora_fin", v);
    if (form.hora_inicio && v) {
      set("duracion_min", String(diffMinutes(form.hora_inicio, v)));
    }
  };

  // Cuando cambia hora_inicio → recalcula hora_fin si hay duracion
  const handleHoraInicioChange = (v: string) => {
    set("hora_inicio", v);
    if (v && form.duracion_min) {
      set("hora_fin", minutesToTime(v, parseFloat(form.duracion_min)));
    } else if (v && form.hora_fin) {
      set("duracion_min", String(diffMinutes(v, form.hora_fin)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      titulo:      form.titulo,
      responsable: form.responsable,
      descripcion: form.descripcion,
      hora_inicio: form.hora_inicio || null,
      hora_fin:    form.hora_fin    || null,
    };
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        {editItem ? "Editar actividad" : "Nueva actividad"}
      </p>

      {/* Título + Responsable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Título *</label>
          <input
            required
            value={form.titulo}
            onChange={e => set("titulo", e.target.value)}
            placeholder="Ej: Presentación solistas infantil"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Responsable</label>
          <input
            value={form.responsable}
            onChange={e => set("responsable", e.target.value)}
            placeholder="Ej: Jurado / MC / Staff"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
          />
        </div>
      </div>

      {/* Hora inicio / fin / duración */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hora inicio</label>
          <input
            type="time"
            value={form.hora_inicio}
            onChange={e => handleHoraInicioChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Hora fin</label>
          <input
            type="time"
            value={form.hora_fin}
            onChange={e => handleHoraFinChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Duración (min)</label>
          <input
            type="number"
            min="1"
            max="480"
            value={form.duracion_min}
            onChange={e => handleDuracionChange(e.target.value)}
            placeholder="Auto"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white"
          />
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={e => set("descripcion", e.target.value)}
          rows={2}
          placeholder="Notas adicionales, instrucciones…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition bg-white resize-none"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {mutation.isPending ? "Guardando…" : editItem ? "Guardar cambios" : "+ Agregar"}
        </button>
        {editItem && (
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Página ────────────────────────────────────────────────────────────────────

export default function CronogramaPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);
  const qc = useQueryClient();

  const { data: evento } = useEvento(eventoId);
  const { data: cronograma, isLoading } = useQuery({
    queryKey: ["cronograma", eventoId],
    queryFn: () => getCronograma(eventoId),
    enabled: !!eventoId,
  });

  const crearMutation = useMutation({
    mutationFn: () => crearCronograma(eventoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cronograma", eventoId] }),
  });

  const [editItem, setEditItem] = useState<ItemCronograma | null>(null);

  const items = cronograma?.items ?? [];
  const slug = evento?.slug ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-semibold text-gray-800">Agenda del evento</h2>
        {slug && (
          <a
            href={`/live/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition font-medium"
          >
            Ver pantalla en vivo →
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      ) : !cronograma ? (
        <div className="text-center py-16 space-y-3 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-400 text-sm">No hay agenda creada para este evento.</p>
          <button
            onClick={() => crearMutation.mutate()}
            disabled={crearMutation.isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {crearMutation.isPending ? "Creando…" : "Crear agenda"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {items.length} {items.length === 1 ? "actividad" : "actividades"}
              {items.length > 0 && (
                <span className="ml-2">
                  · {items.reduce((acc, i) => acc + i.duracion_min, 0)} min total
                </span>
              )}
            </div>
          </div>

          {/* Lista */}
          {items.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">
              Sin actividades. Agrega la primera abajo.
            </p>
          ) : (
            <div>
              {items.map(item => (
                <FilaItem
                  key={item.id}
                  item={item}
                  onEdit={setEditItem}
                />
              ))}
            </div>
          )}

          {/* Formulario */}
          <FormItem
            cronogramaId={cronograma.id}
            nextOrden={items.length + 1}
            editItem={editItem}
            onDone={() => setEditItem(null)}
          />
        </div>
      )}

    </div>
  );
}
