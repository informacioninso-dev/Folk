"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { pagosFullPassApi, pagosCategoriaApi } from "@/features/eventos/api";
import type { PagoFullPass, PagoCategoria } from "@/features/eventos/types";

type TabType = "full_pass" | "categorias";

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-700",
  aprobado:  "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-700",
};

export default function PagosPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  const [tab, setTab] = useState<TabType>("full_pass");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [pagosFullPass, setPagosFullPass] = useState<PagoFullPass[]>([]);
  const [pagosCategoria, setPagosCategoria] = useState<PagoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechazarModal, setRechazarModal] = useState<{ tipo: TabType; id: number } | null>(null);
  const [notaRechazo, setNotaRechazo] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [fp, cat] = await Promise.all([
        pagosFullPassApi.list(eventoId, filtroEstado || undefined),
        pagosCategoriaApi.list(eventoId, filtroEstado || undefined),
      ]);
      setPagosFullPass(fp);
      setPagosCategoria(cat);
    } finally {
      setLoading(false);
    }
  }, [eventoId, filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  async function aprobar(tipo: TabType, id: number) {
    if (tipo === "full_pass") {
      await pagosFullPassApi.aprobar(id);
    } else {
      await pagosCategoriaApi.aprobar(id);
    }
    cargar();
  }

  async function rechazar() {
    if (!rechazarModal) return;
    if (rechazarModal.tipo === "full_pass") {
      await pagosFullPassApi.rechazar(rechazarModal.id, notaRechazo);
    } else {
      await pagosCategoriaApi.rechazar(rechazarModal.id, notaRechazo);
    }
    setRechazarModal(null);
    setNotaRechazo("");
    cargar();
  }

  const items = tab === "full_pass" ? pagosFullPass : pagosCategoria;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">Gestión de pagos</h2>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-indigo-500"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <TabBtn active={tab === "full_pass"} onClick={() => setTab("full_pass")}>
          Full Pass ({pagosFullPass.filter((p) => p.estado === "pendiente").length} pendientes)
        </TabBtn>
        <TabBtn active={tab === "categorias"} onClick={() => setTab("categorias")}>
          Categorías ({pagosCategoria.filter((p) => p.estado === "pendiente").length} pendientes)
        </TabBtn>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center text-gray-400">
          No hay pagos{filtroEstado ? ` con estado "${filtroEstado}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "full_pass" &&
            (pagosFullPass as PagoFullPass[]).map((pago) => (
              <PagoFullPassRow
                key={pago.id}
                pago={pago}
                onAprobar={() => aprobar("full_pass", pago.id)}
                onRechazar={() => setRechazarModal({ tipo: "full_pass", id: pago.id })}
              />
            ))}
          {tab === "categorias" &&
            (pagosCategoria as PagoCategoria[]).map((pago) => (
              <PagoCategoriaRow
                key={pago.id}
                pago={pago}
                onAprobar={() => aprobar("categorias", pago.id)}
                onRechazar={() => setRechazarModal({ tipo: "categorias", id: pago.id })}
              />
            ))}
        </div>
      )}

      {/* Modal de rechazo */}
      {rechazarModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Motivo de rechazo</h3>
            <textarea
              value={notaRechazo}
              onChange={(e) => setNotaRechazo(e.target.value)}
              rows={3}
              placeholder="Explica al participante por qué se rechazó su comprobante..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-400 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRechazarModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={rechazar}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PagoFullPassRow({
  pago,
  onAprobar,
  onRechazar,
}: {
  pago: PagoFullPass;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{pago.nombre_completo}</p>
        <p className="text-sm text-gray-500">Cédula: {pago.cedula} · {pago.correo_electronico}</p>
        {pago.numero_comprobante && (
          <p className="text-xs text-gray-400 mt-0.5">Comprobante: {pago.numero_comprobante}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {pago.comprobante_imagen_url && (
          <a
            href={pago.comprobante_imagen_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline"
          >
            Ver imagen
          </a>
        )}
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ESTADO_BADGE[pago.estado]}`}>
          {pago.estado}
        </span>
        {pago.estado === "pendiente" && (
          <>
            <button
              onClick={onAprobar}
              className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Aprobar
            </button>
            <button
              onClick={onRechazar}
              className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PagoCategoriaRow({
  pago,
  onAprobar,
  onRechazar,
}: {
  pago: PagoCategoria;
  onAprobar: () => void;
  onRechazar: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700">
          Inscripción #{pago.inscripcion ?? "—"}
        </p>
        {pago.numero_comprobante && (
          <p className="text-xs text-gray-400 mt-0.5">Comprobante: {pago.numero_comprobante}</p>
        )}
        <p className="text-xs text-gray-400">
          {new Date(pago.created_at).toLocaleDateString("es-EC")}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {pago.comprobante_imagen_url && (
          <a
            href={pago.comprobante_imagen_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-600 hover:underline"
          >
            Ver imagen
          </a>
        )}
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ESTADO_BADGE[pago.estado]}`}>
          {pago.estado}
        </span>
        {pago.estado === "pendiente" && (
          <>
            <button
              onClick={onAprobar}
              className="bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Aprobar
            </button>
            <button
              onClick={onRechazar}
              className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              Rechazar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        active ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}
