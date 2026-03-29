"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useParticipantesGenerales,
  useAprobarParticipante,
  useRechazarParticipante,
} from "@/features/eventos/hooks";
import type { ParticipanteGeneral } from "@/features/eventos/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADOS = [
  { value: undefined,               label: "Todos"      },
  { value: "pendiente_validacion",  label: "Pendientes" },
  { value: "activo",                label: "Aprobados"  },
  { value: "rechazado",             label: "Rechazados" },
] as const;

const ESTADO_BADGE: Record<string, string> = {
  pendiente_validacion: "bg-yellow-100 text-yellow-800",
  activo:               "bg-green-100 text-green-800",
  rechazado:            "bg-red-100 text-red-800",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente_validacion: "Pendiente",
  activo:               "Aprobado",
  rechazado:            "Rechazado",
};

// ─── Modal de rechazo ─────────────────────────────────────────────────────────

function ModalRechazo({
  participante,
  eventoId,
  onClose,
}: {
  participante: ParticipanteGeneral;
  eventoId: number;
  onClose: () => void;
}) {
  const [nota, setNota] = useState("");
  const rechazar = useRechazarParticipante();

  const handleConfirmar = () => {
    rechazar.mutate(
      { id: participante.id, nota, eventoId },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Rechazar registro</h3>
        <p className="text-sm text-gray-600">
          <strong>{participante.nombre_completo}</strong> — {participante.cedula}
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo de rechazo <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Ej: Comprobante ilegible, pago insuficiente…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={rechazar.isPending}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
          >
            {rechazar.isPending ? "Guardando…" : "Rechazar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fila de participante ─────────────────────────────────────────────────────

function FilaParticipante({
  pg,
  eventoId,
  onRechazar,
}: {
  pg: ParticipanteGeneral;
  eventoId: number;
  onRechazar: (pg: ParticipanteGeneral) => void;
}) {
  const aprobar = useAprobarParticipante();

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-800 text-sm">{pg.nombre_completo}</p>
        <p className="text-xs text-gray-400 mt-0.5">{pg.cedula} · {pg.edad} años</p>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        <p>{pg.correo_electronico}</p>
        <p className="text-xs text-gray-400">{pg.telefono}</p>
      </td>
      <td className="px-4 py-3 text-center">
        {pg.comprobante_pago_url ? (
          <a
            href={pg.comprobante_pago_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline"
          >
            Ver →
          </a>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[pg.estado]}`}>
          {ESTADO_LABEL[pg.estado]}
        </span>
        {pg.estado === "rechazado" && pg.nota_rechazo && (
          <p className="text-xs text-gray-400 mt-1 max-w-[140px] text-left mx-auto">{pg.nota_rechazo}</p>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {pg.estado === "pendiente_validacion" && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => aprobar.mutate({ id: pg.id, eventoId })}
              disabled={aprobar.isPending}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition"
            >
              Aprobar
            </button>
            <button
              onClick={() => onRechazar(pg)}
              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition"
            >
              Rechazar
            </button>
          </div>
        )}
        {pg.estado === "activo" && (
          <button
            onClick={() => onRechazar(pg)}
            className="px-3 py-1 text-xs text-gray-400 hover:text-red-500 transition"
          >
            Revocar
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ParticipantesPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const [filtro, setFiltro] = useState<string | undefined>(undefined);
  const [modalPg, setModalPg] = useState<ParticipanteGeneral | null>(null);

  const { data: participantes, isLoading } = useParticipantesGenerales(eventoId, filtro);

  const pendientes = participantes?.filter((p) => p.estado === "pendiente_validacion").length ?? 0;

  return (
    <>
      {modalPg && (
        <ModalRechazo
          participante={modalPg}
          eventoId={eventoId}
          onClose={() => setModalPg(null)}
        />
      )}

      <div className="space-y-4">
        {/* Header + filtros */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Registros de participantes</h2>
            {pendientes > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {pendientes} pendiente{pendientes > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {ESTADOS.map((e) => (
              <button
                key={String(e.value)}
                onClick={() => setFiltro(e.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  filtro === e.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
            </div>
          ) : !participantes?.length ? (
            <p className="text-center py-12 text-sm text-gray-400">
              {filtro ? "No hay registros con ese estado." : "Aún no hay registros de participantes."}
            </p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Participante</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Contacto</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Comprobante</th>
                  <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((pg) => (
                  <FilaParticipante
                    key={pg.id}
                    pg={pg}
                    eventoId={eventoId}
                    onRechazar={setModalPg}
                  />
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </>
  );
}
