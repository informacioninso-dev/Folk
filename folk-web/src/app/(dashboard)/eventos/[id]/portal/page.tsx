"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { fullPassConfigApi, estadisticasApi, type EventoEstadisticas } from "@/features/eventos/api";
import { useCategorias, useActualizarCategoria } from "@/features/eventos/hooks";
import type { FullPassConfig, CategoriaRitmo } from "@/features/eventos/types";

export default function PortalConfigPage() {
  const { id } = useParams<{ id: string }>();
  const eventoId = Number(id);

  // Portal fields
  const [descripcion, setDescripcion] = useState("");
  const [destacado, setDestacado] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [guardandoPortal, setGuardandoPortal] = useState(false);
  const [portalOk, setPortalOk] = useState(false);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Full Pass Config
  const [fpConfig, setFpConfig] = useState<FullPassConfig | null>(null);
  const [fpForm, setFpForm] = useState({ nombre: "Full Pass", precio: "", es_requerido: true });
  const [guardandoFp, setGuardandoFp] = useState(false);
  const [fpOk, setFpOk] = useState(false);

  // Config participación
  const [permitirMulti, setPermitirMulti]     = useState(false);
  const [categoriasCosto, setCategoriasCosto] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [configOk, setConfigOk]               = useState(false);

  // Precios por categoría
  const { data: categorias } = useCategorias(eventoId);
  const actualizarCat        = useActualizarCategoria(eventoId);
  const [preciosForm, setPreciosForm] = useState<Record<number, { precio: string; incluido: boolean }>>({});

  // Estadísticas
  const [stats, setStats] = useState<EventoEstadisticas | null>(null);

  useEffect(() => {
    // Cargar datos del evento
    apiClient.get(`/eventos/${eventoId}/`).then((r) => {
      const ev = r.data;
      setDescripcion(ev.descripcion_portal ?? "");
      setDestacado(ev.destacado ?? false);
      if (ev.banner_url) setBannerPreview(ev.banner_url);
      setPermitirMulti(ev.permitir_multimodalidad ?? false);
      setCategoriasCosto(ev.categorias_tienen_costo ?? false);
    });

    // Cargar Full Pass Config
    fullPassConfigApi.get(eventoId).then((fp) => {
      if (fp) {
        setFpConfig(fp);
        setFpForm({ nombre: fp.nombre, precio: fp.precio, es_requerido: fp.es_requerido });
      }
    });

    // Estadísticas
    estadisticasApi.get(eventoId).then(setStats).catch(() => null);
  }, [eventoId]);

  // Inicializar form de precios cuando lleguen las categorías
  useEffect(() => {
    if (!categorias) return;
    setPreciosForm((prev) => {
      const next = { ...prev };
      for (const cat of categorias) {
        if (!(cat.id in next)) {
          next[cat.id] = {
            precio: cat.precio_adicional,
            incluido: cat.incluido_full_pass,
          };
        }
      }
      return next;
    });
  }, [categorias]);

  async function guardarPortal() {
    setGuardandoPortal(true);
    setPortalOk(false);
    try {
      const fd = new FormData();
      fd.append("descripcion_portal", descripcion);
      fd.append("destacado", String(destacado));
      if (bannerFile) fd.append("banner", bannerFile);
      await apiClient.patch(`/eventos/${eventoId}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPortalOk(true);
    } finally {
      setGuardandoPortal(false);
    }
  }

  async function guardarFullPass() {
    setGuardandoFp(true);
    setFpOk(false);
    try {
      if (fpConfig) {
        const updated = await fullPassConfigApi.update(fpConfig.id, {
          nombre: fpForm.nombre,
          precio: fpForm.precio,
          es_requerido: fpForm.es_requerido,
        });
        setFpConfig(updated);
      } else {
        const created = await fullPassConfigApi.create({
          evento: eventoId,
          nombre: fpForm.nombre,
          precio: fpForm.precio,
          es_requerido: fpForm.es_requerido,
        });
        setFpConfig(created);
      }
      setFpOk(true);
    } finally {
      setGuardandoFp(false);
    }
  }

  async function guardarConfig() {
    setGuardandoConfig(true);
    setConfigOk(false);
    try {
      await apiClient.patch(`/eventos/${eventoId}/`, {
        permitir_multimodalidad: permitirMulti,
        categorias_tienen_costo: categoriasCosto,
      });
      setConfigOk(true);
    } finally {
      setGuardandoConfig(false);
    }
  }

  async function guardarPrecioCategoria(cat: CategoriaRitmo) {
    const form = preciosForm[cat.id];
    if (!form) return;
    await actualizarCat.mutateAsync({
      id: cat.id,
      data: {
        precio_adicional: form.incluido ? "0.00" : form.precio,
        incluido_full_pass: form.incluido,
      },
    });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <h2 className="text-xl font-bold text-gray-900">Configuración del portal</h2>

      {/* ── Estadísticas rápidas ──────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Full Pass aprobados" value={stats.full_pass.aprobados} color="green" />
          <StatCard label="Pendientes" value={stats.full_pass.pendientes} color="yellow" />
          <StatCard label="Rechazados" value={stats.full_pass.rechazados} color="red" />
          <StatCard
            label="Ingresos esperados"
            value={`$${stats.full_pass.ingreso_esperado.toFixed(2)}`}
            color="indigo"
          />
        </div>
      )}

      {/* ── Banner y descripción ──────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Banner y descripción</h3>

        {/* Banner */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">Banner del evento</label>
          <div
            onClick={() => bannerRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 transition"
          >
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="banner"
                className="h-40 mx-auto object-cover rounded-lg"
              />
            ) : (
              <p className="text-gray-400 text-sm">Haz clic para subir el banner (imagen)</p>
            )}
          </div>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setBannerFile(f);
                setBannerPreview(URL.createObjectURL(f));
              }
            }}
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm text-gray-600 mb-2">Descripción del evento</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-indigo-500 resize-none"
            placeholder="Describe el evento, sus reglas, condiciones..."
          />
        </div>

        {/* Destacado */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={destacado}
            onChange={(e) => setDestacado(e.target.checked)}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="text-sm text-gray-700">
            Mostrar en el slider de eventos destacados de la homepage
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={guardarPortal}
            disabled={guardandoPortal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {guardandoPortal ? "Guardando..." : "Guardar"}
          </button>
          {portalOk && <span className="text-green-600 text-sm">✓ Guardado</span>}
        </div>
      </section>

      {/* ── Full Pass ─────────────────────────────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Configuración del Full Pass</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Nombre</label>
            <input
              value={fpForm.nombre}
              onChange={(e) => setFpForm({ ...fpForm, nombre: e.target.value })}
              className={inputCls}
              placeholder="Full Pass"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">Precio (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={fpForm.precio}
              onChange={(e) => setFpForm({ ...fpForm, precio: e.target.value })}
              className={inputCls}
              placeholder="0.00"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={fpForm.es_requerido}
            onChange={(e) => setFpForm({ ...fpForm, es_requerido: e.target.checked })}
            className="w-4 h-4 accent-indigo-600"
          />
          <span className="text-sm text-gray-700">
            Requerido — los participantes deben pagarlo antes de registrar categorías
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={guardarFullPass}
            disabled={guardandoFp || !fpForm.precio}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {guardandoFp ? "Guardando..." : fpConfig ? "Actualizar" : "Crear Full Pass"}
          </button>
          {fpOk && <span className="text-green-600 text-sm">✓ Guardado</span>}
        </div>
      </section>

      {/* ── Configuración de participación ───────────────────────────────── */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold text-gray-800">Configuración de participación</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={permitirMulti}
            onChange={(e) => setPermitirMulti(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-indigo-600"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Permitir mismo ritmo en múltiples modalidades</span>
            <p className="text-xs text-gray-400 mt-0.5">
              Un participante puede inscribirse en Salsa Solista y también en Salsa Pareja en el mismo evento.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={categoriasCosto}
            onChange={(e) => setCategoriasCosto(e.target.checked)}
            className="w-4 h-4 mt-0.5 accent-indigo-600"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Las categorías tienen costo adicional al Full Pass</span>
            <p className="text-xs text-gray-400 mt-0.5">
              Activa esto para configurar un precio por categoría o marcarlas como incluidas en el Full Pass.
            </p>
          </div>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={guardarConfig}
            disabled={guardandoConfig}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
          >
            {guardandoConfig ? "Guardando..." : "Guardar"}
          </button>
          {configOk && <span className="text-green-600 text-sm">✓ Guardado</span>}
        </div>
      </section>

      {/* ── Precios por categoría ─────────────────────────────────────────── */}
      {categoriasCosto && categorias && categorias.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Precio por categoría</h3>
          <p className="text-sm text-gray-500">
            Configura el precio adicional de cada categoría o márcala como incluida en el Full Pass
            (sin costo extra y sin requerir comprobante).
          </p>
          <div className="divide-y divide-gray-100">
            {categorias.map((cat) => {
              const form = preciosForm[cat.id] ?? { precio: cat.precio_adicional, incluido: cat.incluido_full_pass };
              const MODAL_LABEL: Record<string, string> = { solista: "Solista", pareja: "Pareja", grupo: "Grupo" };
              return (
                <div key={cat.id} className="py-3 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-800 text-sm">{cat.nombre_ritmo}</span>
                    <span className="ml-2 text-xs text-gray-400">{MODAL_LABEL[cat.modalidad]}</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={form.incluido}
                      onChange={(e) =>
                        setPreciosForm((p) => ({ ...p, [cat.id]: { ...form, incluido: e.target.checked } }))
                      }
                      className="w-4 h-4 accent-indigo-600"
                    />
                    Incluido en FP
                  </label>
                  {!form.incluido && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.precio}
                      onChange={(e) =>
                        setPreciosForm((p) => ({ ...p, [cat.id]: { ...form, precio: e.target.value } }))
                      }
                      placeholder="0.00"
                      className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  )}
                  <button
                    onClick={() => guardarPrecioCategoria(cat)}
                    disabled={actualizarCat.isPending}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Estadísticas por categoría ────────────────────────────────────── */}
      {stats && stats.categorias.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Inscripciones por categoría</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3">Ritmo</th>
                  <th className="pb-3">Modalidad</th>
                  <th className="pb-3 text-right">Precio</th>
                  <th className="pb-3 text-right">Inscritos</th>
                  <th className="pb-3 text-right">Aprobados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.categorias.map((cat, i) => (
                  <tr key={i}>
                    <td className="py-3 font-medium">{cat.ritmo}</td>
                    <td className="py-3 capitalize text-gray-600">{cat.modalidad}</td>
                    <td className="py-3 text-right">${cat.precio_adicional.toFixed(2)}</td>
                    <td className="py-3 text-right">{cat.total}</td>
                    <td className="py-3 text-right text-green-600 font-semibold">{cat.aprobadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:outline-none focus:border-indigo-500";

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "green" | "yellow" | "red" | "indigo";
}) {
  const colors = {
    green:  "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
    red:    "bg-red-50 text-red-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
