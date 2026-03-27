"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useOrganizadores,
  useCrearCliente,
  useEliminarOrganizador,
  useResetPassword,
  useSiteConfig,
  useUpdateSiteConfig,
} from "@/features/superadmin/hooks";
import type { OrganizadorDetalle } from "@/features/superadmin/types";

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  nombre: z.string().min(2, "Requerido"),
  nit_ruc: z.string().min(4, "Requerido"),
  email_contacto: z.string().min(1, "Requerido"),
  username: z.string().min(3, "Mínimo 3 caracteres"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;
type Credentials = { username: string; password: string; empresa?: string };

// ─── Modal de credenciales ────────────────────────────────────────────────────

function CredencialesModal({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `Acceso a Folk\nEmpresa: ${creds.empresa ?? ""}\nUsuario: ${creds.username}\nContraseña: ${creds.password}\nURL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-green-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-green-400 text-xl">✓</span>
          <h2 className="text-lg font-bold text-white">Credenciales de acceso</h2>
        </div>

        {creds.empresa && (
          <p className="text-sm text-gray-400 mb-4">Cliente: <span className="text-white font-medium">{creds.empresa}</span></p>
        )}

        <div className="bg-gray-950 border border-gray-700 rounded-xl p-4 space-y-3 font-mono text-sm mb-4">
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide">Usuario</span>
            <p className="text-indigo-300 text-base mt-0.5">{creds.username}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide">Contraseña</span>
            <p className="text-green-300 text-base mt-0.5">{creds.password}</p>
          </div>
          <div>
            <span className="text-gray-500 text-xs uppercase tracking-wide">URL de acceso</span>
            <p className="text-gray-400 text-xs mt-0.5">{typeof window !== "undefined" ? window.location.origin : ""}/login</p>
          </div>
        </div>

        <p className="text-xs text-yellow-500 mb-4">
          ⚠ Guarda esta contraseña ahora. No podrás verla de nuevo.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition"
          >
            {copied ? "¡Copiado!" : "Copiar todo"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fila de organizador ──────────────────────────────────────────────────────

function OrganizadorRow({
  org,
  onDelete,
  onShowCreds,
}: {
  org: OrganizadorDetalle;
  onDelete: (id: number) => void;
  onShowCreds: (creds: Credentials) => void;
}) {
  const resetMutation = useResetPassword();
  const fecha = new Date(org.created_at).toLocaleDateString("es-EC");

  const handleReset = () => {
    if (!confirm(`¿Resetear contraseña de ${org.nombre}? Se generará una nueva clave.`)) return;
    resetMutation.mutate(org.id, {
      onSuccess: (data) => onShowCreds({ ...data, empresa: org.nombre }),
    });
  };

  return (
    <tr className="border-b border-gray-800 hover:bg-gray-900/60 transition-colors group">
      <td className="px-4 py-3">
        <Link
          href={`/superadmin/organizadores/${org.id}`}
          className="text-white font-medium group-hover:text-indigo-400 transition-colors"
        >
          {org.nombre}
        </Link>
      </td>
      <td className="px-4 py-3 text-gray-400 text-sm">{org.nit_ruc}</td>
      <td className="px-4 py-3 text-gray-400 text-sm">{org.email_contacto}</td>
      <td className="px-4 py-3 text-gray-400 text-sm font-mono">
        {org.username ?? <span className="text-gray-600 italic">sin usuario</span>}
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            org.username ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"
          }`}
        >
          {org.username ? "Con acceso" : "Sin usuario"}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 text-sm">{fecha}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Link
            href={`/superadmin/organizadores/${org.id}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Ver
          </Link>
          {org.usuario && (
            <button
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors disabled:opacity-50"
            >
              {resetMutation.isPending ? "…" : "Reset clave"}
            </button>
          )}
          <button
            onClick={() => {
              if (confirm(`¿Eliminar a ${org.nombre}? Esta acción no se puede deshacer.`)) {
                onDelete(org.id);
              }
            }}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Modal de nuevo cliente ───────────────────────────────────────────────────

function NuevoClienteModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (creds: Credentials) => void;
}) {
  const crearMutation = useCrearCliente();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    crearMutation.mutate(values, {
      onSuccess: () => {
        onCreated({
          username: values.username,
          password: values.password,
          empresa: values.nombre,
        });
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-5">Nuevo cliente</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[
            { name: "nombre" as const, label: "Nombre de la empresa", placeholder: "Ej: Academia de Danza XYZ" },
            { name: "nit_ruc" as const, label: "NIT / RUC", placeholder: "Número de identificación fiscal" },
            { name: "email_contacto" as const, label: "Email de contacto", placeholder: "contacto@empresa.com" },
            { name: "username" as const, label: "Usuario de acceso", placeholder: "nombre_usuario" },
            { name: "password" as const, label: "Contraseña inicial", placeholder: "Mínimo 8 caracteres" },
          ].map(({ name, label, placeholder }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
              <input
                {...register(name)}
                type={name === "password" ? "password" : "text"}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              {errors[name] && (
                <p className="text-xs text-red-400 mt-1">{errors[name]?.message}</p>
              )}
            </div>
          ))}

          {crearMutation.isError && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-3 py-2 text-sm">
              Error al crear el cliente. Verifica los datos.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearMutation.isPending}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition"
            >
              {crearMutation.isPending ? "Creando…" : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tab Clientes ─────────────────────────────────────────────────────────────

function TabClientes() {
  const { data: organizadores, isLoading } = useOrganizadores();
  const eliminarMutation = useEliminarOrganizador();
  const [showModal, setShowModal] = useState(false);
  const [creds, setCreds] = useState<Credentials | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {organizadores?.length ?? 0} organizadores registrados
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + Nuevo cliente
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {organizadores && organizadores.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-lg">No hay clientes registrados aún.</p>
          <p className="text-sm mt-1">Crea el primer organizador con el botón de arriba.</p>
        </div>
      )}

      {organizadores && organizadores.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Empresa</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">NIT/RUC</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Usuario</th>
                <th className="text-center px-4 py-3 text-gray-400 font-medium">Acceso</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Alta</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {organizadores.map((org) => (
                <OrganizadorRow
                  key={org.id}
                  org={org}
                  onDelete={(id) => eliminarMutation.mutate(id)}
                  onShowCreds={setCreds}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <NuevoClienteModal
          onClose={() => setShowModal(false)}
          onCreated={(c) => {
            setShowModal(false);
            setCreds(c);
          }}
        />
      )}

      {creds && <CredencialesModal creds={creds} onClose={() => setCreds(null)} />}
    </div>
  );
}

// ─── Tab Configuración ────────────────────────────────────────────────────────

function TabConfiguracion() {
  const { data: config, isLoading } = useSiteConfig();
  const updateMutation = useUpdateSiteConfig();
  const [numero, setNumero] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [saved, setSaved] = useState(false);

  // Sync local state when data loads
  const [initialised, setInitialised] = useState(false);
  if (config && !initialised) {
    setNumero(config.whatsapp_numero);
    setMensaje(config.whatsapp_mensaje);
    setInitialised(true);
  }

  const handleSave = () => {
    updateMutation.mutate(
      { whatsapp_numero: numero, whatsapp_mensaje: mensaje },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">WhatsApp</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Número
            <span className="text-gray-500 font-normal ml-1">(formato internacional, ej: 593999999999)</span>
          </label>
          <input
            type="text"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="593999999999"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Mensaje predeterminado
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={3}
            placeholder="Hola! Quiero más información sobre Folk."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
          />
        </div>

        {numero && (
          <div className="bg-gray-800/60 rounded-lg px-3 py-2 text-xs text-gray-400">
            Preview:{" "}
            <span className="text-green-400 font-mono break-all">
              https://wa.me/{numero}?text={encodeURIComponent(mensaje)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition"
          >
            {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          {saved && <span className="text-green-400 text-sm">¡Guardado!</span>}
          {updateMutation.isError && (
            <span className="text-red-400 text-sm">Error al guardar.</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = "clientes" | "configuracion";

export default function SuperadminPage() {
  const [tab, setTab] = useState<Tab>("clientes");

  const tabs: { id: Tab; label: string }[] = [
    { id: "clientes",      label: "Clientes" },
    { id: "configuracion", label: "Configuración general" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Administración</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "clientes"      && <TabClientes />}
      {tab === "configuracion" && <TabConfiguracion />}
    </div>
  );
}
