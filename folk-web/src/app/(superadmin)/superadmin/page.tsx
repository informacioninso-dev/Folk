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
  useSuperadminDashboard,
  useEnviarComunicado,
} from "@/features/superadmin/hooks";
import type { OrganizadorDetalle, DashboardEvento, DashboardStats } from "@/features/superadmin/types";

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
            { name: "nit_ruc" as const, label: "RUC", placeholder: "Número de identificación fiscal" },
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
  const { data: organizadores, isLoading, isError } = useOrganizadores();
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

      {isError && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">
          Error al cargar clientes. Verifica que las migraciones estén aplicadas y el servidor esté corriendo.
        </div>
      )}

      {!isLoading && !isError && organizadores && organizadores.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-lg">No hay clientes registrados aún.</p>
          <p className="text-sm mt-1">Crea el primer organizador con el botón de arriba.</p>
        </div>
      )}

      {!isLoading && !isError && organizadores && organizadores.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
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
  const [ppVersion, setPpVersion] = useState("");
  const [ppUrl, setPpUrl] = useState("");
  const [avisoCorto, setAvisoCorto] = useState("");
  const [emailHost, setEmailHost] = useState("");
  const [emailPort, setEmailPort] = useState("587");
  const [emailUseTls, setEmailUseTls] = useState(true);
  const [emailUser, setEmailUser] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailFrom, setEmailFrom] = useState("");
  const [saved, setSaved] = useState(false);

  const [initialised, setInitialised] = useState(false);
  if (config && !initialised) {
    setNumero(config.whatsapp_numero);
    setMensaje(config.whatsapp_mensaje);
    setPpVersion(config.politica_privacidad_version);
    setPpUrl(config.politica_privacidad_url);
    setAvisoCorto(config.aviso_privacidad_corto);
    setEmailHost(config.email_host);
    setEmailPort(String(config.email_port));
    setEmailUseTls(config.email_use_tls);
    setEmailUser(config.email_host_user);
    setEmailFrom(config.email_from);
    setInitialised(true);
  }

  const handleSave = () => {
    const payload: Parameters<typeof updateMutation.mutate>[0] = {
      whatsapp_numero: numero,
      whatsapp_mensaje: mensaje,
      politica_privacidad_version: ppVersion,
      politica_privacidad_url: ppUrl,
      aviso_privacidad_corto: avisoCorto,
      email_host: emailHost,
      email_port: Number(emailPort) || 587,
      email_use_tls: emailUseTls,
      email_host_user: emailUser,
      email_from: emailFrom,
      ...(emailPassword ? { email_host_password: emailPassword } : {}),
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        setSaved(true);
        setEmailPassword("");
        setTimeout(() => setSaved(false), 2500);
      },
    });
  };

  const inputCls =
    "w-full px-3 py-3 sm:py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-6">

      {/* WhatsApp */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-5">
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
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mensaje predeterminado</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={3}
            placeholder="Hola! Quiero más información sobre Folk."
            className={`${inputCls} resize-none`}
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
      </div>

      {/* Protección de datos */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Protección de datos</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Versión de política
            <span className="text-gray-500 font-normal ml-1">(ej: 2026-03)</span>
          </label>
          <input
            type="text"
            value={ppVersion}
            onChange={(e) => setPpVersion(e.target.value)}
            placeholder="2026-03"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">URL de política de privacidad</label>
          <input
            type="url"
            value={ppUrl}
            onChange={(e) => setPpUrl(e.target.value)}
            placeholder="https://folk.binnso.com/privacidad"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Aviso corto de privacidad
            <span className="text-gray-500 font-normal ml-1">(se muestra en formularios de inscripción)</span>
          </label>
          <textarea
            value={avisoCorto}
            onChange={(e) => setAvisoCorto(e.target.value)}
            rows={4}
            placeholder="Al registrarte, aceptas el tratamiento de tus datos personales conforme a nuestra política de privacidad."
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {/* Correo saliente */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Correo saliente (SMTP)</h2>
        <p className="text-xs text-gray-500">
          Configura aquí el servidor SMTP para el envío de correos automáticos (aprobación de participantes, recuperación de contraseña, etc.).
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">Servidor SMTP</label>
            <input
              type="text"
              value={emailHost}
              onChange={(e) => setEmailHost(e.target.value)}
              placeholder="smtp.gmail.com"
              className={inputCls}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-300 mb-1">Puerto</label>
            <input
              type="number"
              value={emailPort}
              onChange={(e) => setEmailPort(e.target.value)}
              placeholder="587"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="use-tls"
            type="checkbox"
            checked={emailUseTls}
            onChange={(e) => setEmailUseTls(e.target.checked)}
            className="w-4 h-4 accent-indigo-500"
          />
          <label htmlFor="use-tls" className="text-sm text-gray-300">Usar TLS</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Usuario / correo de envío</label>
          <input
            type="email"
            value={emailUser}
            onChange={(e) => setEmailUser(e.target.value)}
            placeholder="noreply@tudominio.com"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Contraseña / App Password
            <span className="text-gray-500 font-normal ml-1">(déjalo vacío para no cambiarla)</span>
          </label>
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Dirección From:
            <span className="text-gray-500 font-normal ml-1">(si es distinta al usuario)</span>
          </label>
          <input
            type="email"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
            placeholder="Folk Eventos <noreply@tudominio.com>"
            className={inputCls}
          />
        </div>
      </div>

      {/* Guardar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-5 py-3 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition"
        >
          {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
        </button>
        {saved && <span className="text-green-400 text-sm">¡Guardado!</span>}
        {updateMutation.isError && (
          <span className="text-red-400 text-sm">Error al guardar.</span>
        )}
      </div>
    </div>
  );
}

// ─── Tab Comunicados ──────────────────────────────────────────────────────────

function TabComunicados() {
  const { data: organizadores } = useOrganizadores();
  const mutation = useEnviarComunicado();

  const [destinatario, setDestinatario] = useState<"todos" | number>("todos");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<{ enviados: number; destinatarios: string[] } | null>(null);

  const handleEnviar = () => {
    if (!asunto.trim() || !mensaje.trim()) return;
    if (!confirm(
      destinatario === "todos"
        ? `¿Enviar a todos los clientes (${organizadores?.length ?? "?"} destinatarios)?`
        : "¿Enviar comunicado a este cliente?"
    )) return;

    mutation.mutate(
      {
        asunto,
        mensaje,
        organizador_id: destinatario === "todos" ? null : destinatario,
      },
      {
        onSuccess: (data) => {
          setResultado(data);
          setAsunto("");
          setMensaje("");
          setDestinatario("todos");
        },
      }
    );
  };

  const inputCls = "w-full px-3 py-3 sm:py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Nuevo comunicado</h2>
          <p className="text-xs text-gray-500 mt-1">
            Envía un email a uno o todos tus clientes directamente desde aquí.
          </p>
        </div>

        {/* Destinatario */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Destinatario</label>
          <select
            value={destinatario === "todos" ? "todos" : String(destinatario)}
            onChange={(e) => setDestinatario(e.target.value === "todos" ? "todos" : Number(e.target.value))}
            className={inputCls}
          >
            <option value="todos">Todos los clientes</option>
            {organizadores?.map((org) => (
              <option key={org.id} value={String(org.id)}>
                {org.nombre} ({org.email_contacto})
              </option>
            ))}
          </select>
        </div>

        {/* Asunto */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Asunto</label>
          <input
            type="text"
            value={asunto}
            onChange={(e) => setAsunto(e.target.value)}
            placeholder="Ej: Mantenimiento programado del sistema"
            className={inputCls}
          />
        </div>

        {/* Mensaje */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mensaje</label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            rows={6}
            placeholder="Escribe aquí el contenido del comunicado…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {/* Enviar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleEnviar}
            disabled={mutation.isPending || !asunto.trim() || !mensaje.trim()}
            className="px-5 py-3 sm:py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition"
          >
            {mutation.isPending ? "Enviando…" : "Enviar comunicado"}
          </button>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-400">Error al enviar. Verifica la configuración SMTP en Configuración general.</p>
        )}
      </div>

      {/* Confirmación */}
      {resultado && (
        <div className="bg-green-900/40 border border-green-700 rounded-2xl p-4 sm:p-6">
          <p className="text-green-300 font-semibold text-sm mb-2">
            ✓ Comunicado enviado a {resultado.enviados} destinatario(s)
          </p>
          <ul className="space-y-0.5">
            {resultado.destinatarios.map((d) => (
              <li key={d} className="text-xs text-green-400 font-mono">{d}</li>
            ))}
          </ul>
          <button
            onClick={() => setResultado(null)}
            className="mt-3 text-xs text-green-500 hover:text-green-300 transition"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab Panel (Dashboard) ────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl px-5 py-4">
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function EventoRow({ ev }: { ev: DashboardEvento }) {
  const fecha = new Date(ev.fecha + "T00:00:00").toLocaleDateString("es-EC", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 space-y-3 ${
      ev.es_hoy ? "border-indigo-700" : "border-gray-800"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {ev.es_hoy && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">HOY</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ev.portal_activo ? "bg-emerald-900 text-emerald-300" : "bg-gray-800 text-gray-500"
            }`}>
              {ev.portal_activo ? "Portal activo" : "Portal inactivo"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              ev.pago_folk_confirmado ? "bg-green-900 text-green-300" : "bg-orange-950 text-orange-400"
            }`}>
              {ev.pago_folk_confirmado ? "Pagado" : "Pago pendiente"}
            </span>
          </div>
          <h3 className="text-white font-bold mt-1.5">{ev.nombre}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{fecha} · {ev.ubicacion}</p>
        </div>

        {/* Links */}
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/superadmin/organizadores/${ev.organizador_id}`}
            className="text-xs text-gray-400 hover:text-white transition px-2 py-1 border border-gray-700 rounded-lg"
          >
            {ev.organizador_nombre}
          </Link>
          <Link
            href={`/eventos/${ev.id}`}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition px-2 py-1 border border-indigo-900 rounded-lg font-medium"
          >
            Ir al evento →
          </Link>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-800 rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-white">{ev.inscripciones_total}</p>
          <p className="text-xs text-gray-500">Inscritos</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-3 py-2 text-center">
          <p className={`text-lg font-bold ${ev.full_pass_pendientes > 0 ? "text-orange-400" : "text-white"}`}>
            {ev.full_pass_pendientes}
          </p>
          <p className="text-xs text-gray-500">FP pendientes</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold text-white">{ev.categorias_count}</p>
          <p className="text-xs text-gray-500">Categorías</p>
        </div>
      </div>

      {/* Advertencias */}
      {ev.advertencias.length > 0 && (
        <div className="space-y-1">
          {ev.advertencias.map((adv, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-950/40 border border-yellow-900 rounded-lg px-3 py-1.5">
              <span className="shrink-0">⚠</span>
              <span>{adv}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabPanel() {
  const { data, isLoading } = useSuperadminDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const stats = data?.estadisticas;
  const eventos = data?.eventos ?? [];
  const eventosHoy = eventos.filter((e) => e.es_hoy);
  const eventosPróximos = eventos.filter((e) => !e.es_hoy);

  return (
    <div className="space-y-6">
      {/* Stats globales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Clientes" value={stats?.total_clientes ?? 0} />
        <StatCard label="Eventos totales" value={stats?.total_eventos ?? 0} />
        <StatCard label="Portales activos" value={stats?.portales_activos ?? 0} />
        <StatCard label="Inscripciones" value={stats?.total_inscripciones ?? 0} />
        <StatCard label="Full Pass aprobados" value={stats?.full_pass_aprobados ?? 0} />
        <StatCard
          label="Total cobrado"
          value={`$${parseFloat(stats?.total_cobrado ?? "0").toFixed(2)}`}
        />
      </div>

      {/* Eventos de hoy */}
      {eventosHoy.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-3">
            Eventos hoy ({eventosHoy.length})
          </h2>
          <div className="space-y-3">
            {eventosHoy.map((ev) => <EventoRow key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {/* Próximos 7 días */}
      {eventosPróximos.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Próximos 7 días ({eventosPróximos.length})
          </h2>
          <div className="space-y-3">
            {eventosPróximos.map((ev) => <EventoRow key={ev.id} ev={ev} />)}
          </div>
        </div>
      )}

      {eventos.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <p className="text-lg">No hay eventos activos ni próximos esta semana.</p>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Tab = "panel" | "clientes" | "comunicados" | "configuracion";

export default function SuperadminPage() {
  const [tab, setTab] = useState<Tab>("panel");

  const tabs: { id: Tab; label: string }[] = [
    { id: "panel",         label: "Panel" },
    { id: "clientes",      label: "Clientes" },
    { id: "comunicados",   label: "Comunicados" },
    { id: "configuracion", label: "Configuración" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Administración</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-full sm:w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "panel"         && <TabPanel />}
      {tab === "clientes"      && <TabClientes />}
      {tab === "comunicados"   && <TabComunicados />}
      {tab === "configuracion" && <TabConfiguracion />}
    </div>
  );
}
