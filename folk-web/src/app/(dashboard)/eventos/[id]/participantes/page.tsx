"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useParticipantesTodos } from "@/features/eventos/hooks";
import type { ParticipanteUnificado } from "@/features/eventos/types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  pendiente:            "bg-yellow-100 text-yellow-800",
  pendiente_validacion: "bg-yellow-100 text-yellow-800",
  aprobado:             "bg-green-100 text-green-800",
  activo:               "bg-green-100 text-green-800",
  rechazado:            "bg-red-100 text-red-800",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente:            "Pendiente",
  pendiente_validacion: "Pendiente",
  aprobado:             "Aprobado",
  activo:               "Aprobado",
  rechazado:            "Rechazado",
};

const CAT_ESTADO_BADGE: Record<string, string> = {
  pendiente:  "bg-yellow-50 text-yellow-700 border border-yellow-200",
  aprobada:   "bg-green-50 text-green-700 border border-green-200",
  rechazada:  "bg-red-50 text-red-700 border border-red-200",
};

const CAT_ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada:  "Aprobada",
  rechazada: "Rechazada",
};

// ─── Modal detalle ────────────────────────────────────────────────────────────

function ModalDetalle({
  p,
  onClose,
}: {
  p: ParticipanteUnificado;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{p.nombre_completo}</h3>
            <p className="text-sm text-gray-500">{p.cedula}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">✕</button>
        </div>

        <div className="space-y-2 text-sm text-gray-700">
          <p><span className="text-gray-400">Correo:</span> {p.correo_electronico || "—"}</p>
          <p><span className="text-gray-400">Teléfono:</span> {p.telefono || "—"}</p>
          <p>
            <span className="text-gray-400">Tipo:</span>{" "}
            {p.origen === "full_pass" ? "Full Pass" : "Registro general"}
          </p>
          <p>
            <span className="text-gray-400">Estado pago:</span>{" "}
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado] ?? "bg-gray-100 text-gray-600"}`}>
              {ESTADO_LABEL[p.estado] ?? p.estado}
            </span>
          </p>
          {p.comprobante_url && (
            <p>
              <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer"
                className="text-indigo-600 hover:underline text-sm">
                Ver comprobante →
              </a>
            </p>
          )}
        </div>

        {p.categorias.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Categorías inscritas
            </p>
            <div className="space-y-2">
              {p.categorias.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700">{c.nombre}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${CAT_ESTADO_BADGE[c.estado] ?? "bg-gray-100 text-gray-600"}`}>
                    {CAT_ESTADO_LABEL[c.estado] ?? c.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {p.categorias.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">Sin categorías inscritas aún.</p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ─── Tarjeta participante (mobile) ────────────────────────────────────────────

function TarjetaParticipante({
  p,
  onDetalle,
}: {
  p: ParticipanteUnificado;
  onDetalle: () => void;
}) {
  return (
    <button
      onClick={onDetalle}
      className="w-full text-left bg-white border border-gray-200 rounded-xl px-4 py-3.5 hover:border-indigo-300 hover:bg-indigo-50/30 transition space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-gray-800 text-sm leading-tight">{p.nombre_completo}</p>
        <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado] ?? "bg-gray-100 text-gray-600"}`}>
          {ESTADO_LABEL[p.estado] ?? p.estado}
        </span>
      </div>
      <p className="text-xs text-gray-400">{p.cedula}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          p.origen === "full_pass"
            ? "bg-indigo-100 text-indigo-700"
            : "bg-orange-100 text-orange-700"
        }`}>
          {p.origen === "full_pass" ? "Full Pass" : "Registro"}
        </span>
        {p.categorias.length > 0 && (
          <span className="text-xs text-gray-500">
            {p.categorias.length} categoría{p.categorias.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

const FILTROS = [
  { value: "",         label: "Todos"      },
  { value: "pendiente",label: "Pendientes" },
  { value: "aprobado", label: "Aprobados"  },
  { value: "rechazado",label: "Rechazados" },
] as const;

export default function ParticipantesPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const { data: participantes, isLoading } = useParticipantesTodos(eventoId);
  const [filtro, setFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [detalle, setDetalle] = useState<ParticipanteUnificado | null>(null);

  const filtrados = (participantes ?? []).filter((p) => {
    const estadoNorm = p.estado === "pendiente_validacion" ? "pendiente"
                     : p.estado === "activo"               ? "aprobado"
                     : p.estado;
    if (filtro && estadoNorm !== filtro) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (
        p.nombre_completo.toLowerCase().includes(q) ||
        p.cedula.toLowerCase().includes(q) ||
        p.correo_electronico.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const pendientes = (participantes ?? []).filter(
    (p) => p.estado === "pendiente" || p.estado === "pendiente_validacion"
  ).length;

  return (
    <>
      {detalle && <ModalDetalle p={detalle} onClose={() => setDetalle(null)} />}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Participantes</h2>
            {pendientes > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                {pendientes} pendiente{pendientes > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {/* Buscador */}
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, cédula o correo…"
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-1 flex-wrap">
          {FILTROS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filtro === f.value
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-center py-12 text-sm text-gray-400">
            {busqueda || filtro ? "No hay participantes con ese filtro." : "Aún no hay participantes registrados."}
          </p>
        ) : (
          <>
            {/* Vista mobile: tarjetas */}
            <div className="sm:hidden space-y-2">
              {filtrados.map((p) => (
                <TarjetaParticipante key={`${p.origen}-${p.id}`} p={p} onDetalle={() => setDetalle(p)} />
              ))}
            </div>

            {/* Vista tablet/desktop: tabla */}
            <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[620px]">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Participante</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Contacto</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Tipo</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Estado</th>
                      <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Categorías</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-500 font-medium">Comp.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => (
                      <tr
                        key={`${p.origen}-${p.id}`}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setDetalle(p)}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{p.nombre_completo}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{p.cedula}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <p className="truncate max-w-[160px]">{p.correo_electronico}</p>
                          <p className="text-xs text-gray-400">{p.telefono}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            p.origen === "full_pass"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-orange-100 text-orange-700"
                          }`}>
                            {p.origen === "full_pass" ? "Full Pass" : "Registro"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[p.estado] ?? "bg-gray-100 text-gray-600"}`}>
                            {ESTADO_LABEL[p.estado] ?? p.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.categorias.length === 0 ? (
                            <span className="text-xs text-gray-300">—</span>
                          ) : (
                            <div className="space-y-0.5">
                              {p.categorias.slice(0, 2).map((c) => (
                                <p key={c.id} className="text-xs text-gray-600 truncate max-w-[180px]">{c.nombre}</p>
                              ))}
                              {p.categorias.length > 2 && (
                                <p className="text-xs text-indigo-500">+{p.categorias.length - 2} más</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {p.comprobante_url ? (
                            <a
                              href={p.comprobante_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              Ver →
                            </a>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {participantes && participantes.length > 0 && (
          <p className="text-xs text-gray-400 text-right">
            {filtrados.length} de {participantes.length} participante{participantes.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </>
  );
}
