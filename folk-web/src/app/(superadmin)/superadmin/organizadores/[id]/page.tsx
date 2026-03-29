"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrganizador, useEventosDeOrganizador, useRegistrarPagoEvento, useSetLimiteEventos, useUpdateNotasInternas, usePagosFullPassDeEvento, useActualizarEstadoPagoFP, useActividadOrganizador, useActualizarPlan } from "@/features/superadmin/hooks";
import type { Evento } from "@/features/eventos/types";
import type { PagoFullPassSA, ActividadItem } from "@/features/superadmin/types";

// ─── Panel de pagos de emergencia ────────────────────────────────────────────

function PagosEmergencia({ eventoId }: { eventoId: number }) {
  const { data: pagos, isLoading } = usePagosFullPassDeEvento(eventoId);
  const mutation = useActualizarEstadoPagoFP(eventoId);
  const [rechazandoId, setRechazandoId] = useState<number | null>(null);
  const [notaRechazo, setNotaRechazo] = useState("");

  const pendientes = pagos?.filter((p) => p.estado === "pendiente") ?? [];
  const otros = pagos?.filter((p) => p.estado !== "pendiente") ?? [];

  if (isLoading) return <div className="h-8 bg-gray-100 rounded-xl animate-pulse mt-3" />;
  if (!pagos || pagos.length === 0) return (
    <p className="text-xs text-gray-400 italic mt-3">Sin pagos Full Pass registrados.</p>
  );

  const handleAprobar = (pago: PagoFullPassSA) => {
    if (!confirm(`¿Aprobar el Full Pass de ${pago.nombre_completo} (${pago.cedula})?`)) return;
    mutation.mutate({ pagoId: pago.id, data: { estado: "aprobado" } });
  };

  const handleRechazar = (pago: PagoFullPassSA) => {
    mutation.mutate({ pagoId: pago.id, data: { estado: "rechazado", nota_rechazo: notaRechazo } }, {
      onSuccess: () => { setRechazandoId(null); setNotaRechazo(""); },
    });
  };

  return (
    <div className="mt-3 space-y-2">
      {pendientes.length > 0 && (
        <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
          {pendientes.length} pago(s) pendiente(s) de revisión
        </p>
      )}
      {[...pendientes, ...otros].map((pago) => (
        <div key={pago.id} className={`rounded-xl border px-4 py-3 text-sm space-y-2 ${
          pago.estado === "pendiente" ? "border-orange-200 bg-orange-50" :
          pago.estado === "aprobado"  ? "border-green-200 bg-green-50" :
                                        "border-red-200 bg-red-50"
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-gray-800">{pago.nombre_completo}</p>
              <p className="text-xs text-gray-500">{pago.cedula} · {pago.correo_electronico}</p>
              {pago.numero_comprobante && (
                <p className="text-xs text-gray-400">Comprobante: {pago.numero_comprobante}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                pago.estado === "pendiente" ? "bg-orange-200 text-orange-800" :
                pago.estado === "aprobado"  ? "bg-green-200 text-green-800" :
                                              "bg-red-200 text-red-800"
              }`}>
                {pago.estado}
              </span>
              {pago.comprobante_imagen_url && (
                <a href={pago.comprobante_imagen_url} target="_blank" rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline">
                  Ver comprobante
                </a>
              )}
            </div>
          </div>

          {pago.estado === "pendiente" && (
            rechazandoId === pago.id ? (
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={notaRechazo}
                  onChange={(e) => setNotaRechazo(e.target.value)}
                  placeholder="Motivo del rechazo (opcional)"
                  className="flex-1 min-w-[160px] px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-red-400"
                />
                <button
                  onClick={() => handleRechazar(pago)}
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  Confirmar rechazo
                </button>
                <button onClick={() => setRechazandoId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAprobar(pago)}
                  disabled={mutation.isPending}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => { setRechazandoId(pago.id); setNotaRechazo(""); }}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-lg transition"
                >
                  Rechazar
                </button>
              </div>
            )
          )}

          {pago.estado === "rechazado" && pago.nota_rechazo && (
            <p className="text-xs text-red-500">Motivo: {pago.nota_rechazo}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tarjeta de evento con gestión de pago ────────────────────────────────────

function EventoCard({ evento, organizadorId }: { evento: Evento; organizadorId: number }) {
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(evento.monto_folk ?? "");
  const [notas, setNotas] = useState(evento.notas_pago ?? "");
  const [verPagos, setVerPagos] = useState(false);
  const pagoMutation = useRegistrarPagoEvento(organizadorId);

  const fecha = new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-EC", {
    year: "numeric", month: "short", day: "numeric",
  });

  const togglePago = () => {
    pagoMutation.mutate({
      eventoId: evento.id,
      data: { pago_folk_confirmado: !evento.pago_folk_confirmado },
    });
  };

  const guardarDetalle = () => {
    pagoMutation.mutate({
      eventoId: evento.id,
      data: { monto_folk: monto || undefined, notas_pago: notas },
    }, { onSuccess: () => setEditando(false) });
  };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all ${
      evento.pago_folk_confirmado ? "border-green-200" : "border-gray-200"
    }`}>
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{evento.nombre}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              evento.activo ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
            }`}>
              {evento.activo ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">{fecha} · {evento.ubicacion}</p>
        </div>

        {/* Badge de pago Folk */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <button
            onClick={togglePago}
            disabled={pagoMutation.isPending}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
              evento.pago_folk_confirmado
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${evento.pago_folk_confirmado ? "bg-green-500" : "bg-orange-400"}`} />
            {evento.pago_folk_confirmado ? "Pagado" : "Pendiente"}
          </button>
          {evento.monto_folk && (
            <span className="text-sm font-extrabold text-gray-800">${parseFloat(evento.monto_folk).toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Acceso directo + Pagos de emergencia */}
      <div className="border-t border-gray-100 px-5 py-2.5 bg-indigo-50/60 flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => setVerPagos((v) => !v)}
          className="text-xs text-orange-600 hover:text-orange-800 font-semibold transition"
        >
          {verPagos ? "Ocultar pagos FP" : "Gestionar pagos FP"}
        </button>
        <Link
          href={`/eventos/${evento.id}`}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition flex items-center gap-1"
        >
          Abrir panel del evento →
        </Link>
      </div>

      {verPagos && (
        <div className="border-t border-gray-100 px-5 py-4 bg-white">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Pagos Full Pass — gestión de emergencia
          </p>
          <PagosEmergencia eventoId={evento.id} />
        </div>
      )}

      {/* Detalle de pago */}
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between gap-4">
        {!editando ? (
          <>
            <p className="text-xs text-gray-400 flex-1 truncate">
              {evento.notas_pago || "Sin notas de cobro"}
            </p>
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-orange-500 hover:text-orange-700 font-medium transition shrink-0"
            >
              {evento.monto_folk ? "Editar cobro" : "Registrar cobro"}
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-wrap items-center gap-2">
            <input
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Monto $"
              className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas (opcional)"
              className="flex-1 min-w-[120px] px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <button
              onClick={guardarDetalle}
              disabled={pagoMutation.isPending}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
            >
              {pagoMutation.isPending ? "…" : "Guardar"}
            </button>
            <button
              onClick={() => setEditando(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function OrganizadorDetallePage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: org, isLoading: loadingOrg } = useOrganizador(id);
  const { data: eventos, isLoading: loadingEventos } = useEventosDeOrganizador(id);
  const limiteMutation = useSetLimiteEventos();
  const notasMutation = useUpdateNotasInternas(id);
  const planMutation = useActualizarPlan(id);
  const [editandoLimite, setEditandoLimite] = useState(false);
  const [nuevoLimite, setNuevoLimite] = useState("");
  const [editandoNotas, setEditandoNotas] = useState(false);
  const [notas, setNotas] = useState("");
  const [notasGuardadas, setNotasGuardadas] = useState(false);
  const [editandoPlan, setEditandoPlan] = useState(false);
  const [planNombre, setPlanNombre] = useState("");
  const [planVenc, setPlanVenc] = useState("");
  const [planNotas, setPlanNotas] = useState("");
  const [planGuardado, setPlanGuardado] = useState(false);

  const total       = eventos?.length ?? 0;
  const activos     = eventos?.filter((e) => e.activo).length ?? 0;
  const pagados     = eventos?.filter((e) => e.pago_folk_confirmado).length ?? 0;
  const pendientes  = total - pagados;
  const totalCobrado = eventos?.reduce((sum, e) =>
    e.pago_folk_confirmado && e.monto_folk ? sum + parseFloat(e.monto_folk) : sum, 0
  ) ?? 0;

  if (loadingOrg) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-5 bg-gray-100 rounded w-24" />
        <div className="h-8 bg-gray-100 rounded w-1/3" />
      </div>
    );
  }

  if (!org) return <p className="text-gray-500">Organizador no encontrado.</p>;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link href="/superadmin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-600 transition font-medium">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Clientes
      </Link>

      {/* Info del cliente */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{org.nombre}</h1>
            <p className="text-gray-400 text-sm mt-1">{org.email_contacto}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">NIT / RUC</p>
              <p className="text-gray-700 font-mono text-sm font-semibold">{org.nit_ruc}</p>
            </div>
            {/* Límite de eventos */}
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">Límite de eventos</p>
              {!editandoLimite ? (
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-gray-800 font-bold text-sm">{org.max_eventos}</span>
                  <button
                    onClick={() => { setNuevoLimite(String(org.max_eventos)); setEditandoLimite(true); }}
                    className="text-xs text-orange-500 hover:text-orange-700 font-medium transition"
                  >
                    Editar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-end">
                  <input
                    type="number"
                    min={1}
                    value={nuevoLimite}
                    onChange={(e) => setNuevoLimite(e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-orange-400 text-center"
                  />
                  <button
                    onClick={() => limiteMutation.mutate(
                      { organizadorId: id, max_eventos: Number(nuevoLimite) },
                      { onSuccess: () => setEditandoLimite(false) }
                    )}
                    disabled={limiteMutation.isPending || !nuevoLimite}
                    className="px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {limiteMutation.isPending ? "…" : "OK"}
                  </button>
                  <button
                    onClick={() => setEditandoLimite(false)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <Stat label="Eventos totales" value={total} />
          <Stat label="Activos" value={activos} color="emerald" />
          <Stat label="Pagos pendientes" value={pendientes} color={pendientes > 0 ? "orange" : "gray"} />
          <Stat label="Total cobrado" value={`$${totalCobrado.toFixed(2)}`} color="orange" />
        </div>
      </div>

      {/* Plan y créditos */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Plan y créditos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configuración del plan contratado</p>
          </div>
          {!editandoPlan && (
            <button
              onClick={() => {
                setPlanNombre(org.plan_nombre ?? "");
                setPlanVenc(org.plan_fecha_venc ?? "");
                setPlanNotas(org.plan_notas ?? "");
                setNuevoLimite(String(org.max_eventos));
                setEditandoPlan(true);
                setPlanGuardado(false);
              }}
              className="text-xs text-orange-500 hover:text-orange-700 font-medium transition"
            >
              Editar plan
            </button>
          )}
        </div>

        {!editandoPlan ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-400">Plan</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{org.plan_nombre || <span className="italic text-gray-400">Sin plan</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Máx. eventos</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{org.max_eventos}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Vence</p>
              <p className={`text-sm font-semibold mt-0.5 ${
                org.plan_fecha_venc && new Date(org.plan_fecha_venc) < new Date()
                  ? "text-red-600"
                  : "text-gray-800"
              }`}>
                {org.plan_fecha_venc
                  ? new Date(org.plan_fecha_venc + "T00:00:00").toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
                  : <span className="italic text-gray-400">Sin vencimiento</span>}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400">Notas de cobro</p>
              <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{org.plan_notas || <span className="italic">—</span>}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <input
                  type="text"
                  value={planNombre}
                  onChange={(e) => setPlanNombre(e.target.value)}
                  placeholder="Básico, Pro, Enterprise…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Máx. eventos</label>
                <input
                  type="number"
                  min={1}
                  value={nuevoLimite}
                  onChange={(e) => setNuevoLimite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de vencimiento</label>
                <input
                  type="date"
                  value={planVenc}
                  onChange={(e) => setPlanVenc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas / historial de cobros</label>
              <textarea
                value={planNotas}
                onChange={(e) => setPlanNotas(e.target.value)}
                rows={3}
                placeholder="Ej: Pagó $50 el 01-ene-2026. Renovar en marzo…"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 transition resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  planMutation.mutate(
                    {
                      plan_nombre: planNombre,
                      plan_fecha_venc: planVenc || null,
                      plan_notas: planNotas,
                      max_eventos: Number(nuevoLimite) || 1,
                    },
                    {
                      onSuccess: () => {
                        setEditandoPlan(false);
                        setPlanGuardado(true);
                        setTimeout(() => setPlanGuardado(false), 2500);
                      },
                    }
                  );
                }}
                disabled={planMutation.isPending}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {planMutation.isPending ? "Guardando…" : "Guardar plan"}
              </button>
              <button onClick={() => setEditandoPlan(false)} className="text-xs text-gray-400 hover:text-gray-600 transition">
                Cancelar
              </button>
            </div>
          </div>
        )}
        {planGuardado && <p className="text-xs text-green-600 mt-2">✓ Plan actualizado</p>}
      </div>

      {/* Notas internas */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Notas internas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Visibles solo para el equipo Folk</p>
          </div>
          {!editandoNotas && (
            <button
              onClick={() => { setNotas(org.notas_internas ?? ""); setEditandoNotas(true); setNotasGuardadas(false); }}
              className="text-xs text-orange-500 hover:text-orange-700 font-medium transition"
            >
              {org.notas_internas ? "Editar" : "+ Agregar nota"}
            </button>
          )}
        </div>

        {!editandoNotas ? (
          org.notas_internas ? (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{org.notas_internas}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Sin notas. Haz clic en Agregar nota para escribir algo.</p>
          )
        ) : (
          <div className="space-y-3">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={4}
              placeholder="Ej: Cliente pagó por transferencia el 15 de enero. Prefiere contacto por email..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-300 transition resize-none"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  notasMutation.mutate(notas, {
                    onSuccess: () => {
                      setEditandoNotas(false);
                      setNotasGuardadas(true);
                      setTimeout(() => setNotasGuardadas(false), 2500);
                    },
                  });
                }}
                disabled={notasMutation.isPending}
                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
              >
                {notasMutation.isPending ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={() => setEditandoNotas(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {notasGuardadas && <p className="text-xs text-green-600 mt-2">✓ Guardado</p>}
      </div>

      {/* Eventos */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Eventos
          <span className="ml-2 text-sm font-normal text-gray-400">({total})</span>
        </h2>

        {loadingEventos ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
          </div>
        ) : !eventos || eventos.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <p>Este cliente no tiene eventos registrados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventos.map((ev) => (
              <EventoCard key={ev.id} evento={ev} organizadorId={id} />
            ))}
          </div>
        )}
      </div>

      {/* Historial de actividad */}
      <ActividadPanel organizadorId={id} />
    </div>
  );
}

// ─── Historial de actividad ───────────────────────────────────────────────────

const TIPO_LABEL: Record<string, { label: string; color: string }> = {
  inscripcion:         { label: "Inscripción",   color: "bg-indigo-100 text-indigo-700" },
  full_pass:           { label: "Full Pass",     color: "bg-orange-100 text-orange-700" },
  full_pass_actualizado: { label: "FP actualizado", color: "bg-yellow-100 text-yellow-700" },
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente:          "text-orange-500",
  aprobado:           "text-green-600",
  aprobada:           "text-green-600",
  rechazado:          "text-red-500",
  rechazada:          "text-red-500",
  pendiente_validacion: "text-yellow-600",
  activo:             "text-green-600",
};

function ActividadPanel({ organizadorId }: { organizadorId: number }) {
  const { data: actividad, isLoading } = useActividadOrganizador(organizadorId);
  const [expandido, setExpandido] = useState(false);
  const items = actividad ?? [];
  const visibles = expandido ? items : items.slice(0, 10);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <h2 className="text-base font-bold text-gray-900">Historial de actividad</h2>
          <p className="text-xs text-gray-400 mt-0.5">Últimas acciones del cliente — se actualiza cada 30 s</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="px-6 py-8 text-sm text-gray-400 text-center italic">Sin actividad registrada.</p>
      ) : (
        <>
          <ul className="divide-y divide-gray-50">
            {visibles.map((item: ActividadItem, idx: number) => {
              const tipoMeta = TIPO_LABEL[item.tipo] ?? { label: item.tipo, color: "bg-gray-100 text-gray-600" };
              const estadoColor = ESTADO_COLOR[item.estado] ?? "text-gray-500";
              const fecha = new Date(item.fecha).toLocaleString("es-EC", {
                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
              });
              return (
                <li key={idx} className="px-6 py-3 flex items-start gap-3">
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${tipoMeta.color}`}>
                    {tipoMeta.label}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">{item.descripcion}</span>
                  <span className={`shrink-0 text-xs font-medium ${estadoColor}`}>{item.estado}</span>
                  <span className="shrink-0 text-xs text-gray-400 whitespace-nowrap">{fecha}</span>
                </li>
              );
            })}
          </ul>
          {items.length > 10 && (
            <div className="px-6 py-3 border-t border-gray-50">
              <button
                onClick={() => setExpandido((v) => !v)}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition"
              >
                {expandido ? "Mostrar menos" : `Ver todos (${items.length})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color = "gray" }: { label: string; value: string | number; color?: string }) {
  const colors: Record<string, string> = {
    gray:    "text-gray-800",
    emerald: "text-emerald-600",
    orange:  "text-orange-600",
  };
  return (
    <div className="text-center">
      <p className={`text-2xl font-extrabold ${colors[color] ?? colors.gray}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
