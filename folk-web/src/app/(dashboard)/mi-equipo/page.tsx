"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useMe } from "@/features/auth/hooks";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface Credentials { username: string; password: string }

// ─── API ──────────────────────────────────────────────────────────────────────

const getTeam   = () => apiClient.get<TeamMember[]>("/organizadores/mi-equipo/").then(r => r.data);
const addMember = (d: { username: string; email: string; password: string }) =>
  apiClient.post<Credentials>("/organizadores/mi-equipo/agregar/", d).then(r => r.data);
const resetMemberPassword = (userId: number) =>
  apiClient.post<Credentials>(`/organizadores/mi-equipo/${userId}/reset-password/`).then(r => r.data);
const removeMember = (userId: number) =>
  apiClient.delete(`/organizadores/mi-equipo/${userId}/`);  // DELETE action

// ─── Credentials modal ────────────────────────────────────────────────────────

function CredencialesModal({ creds, onClose }: { creds: Credentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `Usuario: ${creds.username}\nContraseña: ${creds.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm border border-green-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-green-500 text-xl">✓</span>
          <h2 className="text-lg font-bold text-gray-900">Credenciales</h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-sm space-y-2 mb-4">
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Usuario</span>
            <p className="text-indigo-700 font-semibold">{creds.username}</p>
          </div>
          <div>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Contraseña</span>
            <p className="text-green-700 font-semibold">{creds.password}</p>
          </div>
        </div>
        <p className="text-xs text-yellow-600 mb-4">⚠ Guarda esta contraseña. No podrás verla de nuevo.</p>
        <div className="flex gap-3">
          <button onClick={handleCopy} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-xl transition">
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-xl hover:bg-gray-50 transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add member modal ─────────────────────────────────────────────────────────

function AgregarMiembroModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Credentials) => void }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: addMember,
    onSuccess: (data) => onCreated(data),
    onError: () => setError("Error al crear el usuario. Verifica los datos."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.password) return;
    mutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Agregar miembro</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: "username", label: "Usuario", placeholder: "nombre_usuario", type: "text" },
            { key: "email",    label: "Email (opcional)", placeholder: "correo@empresa.com", type: "email" },
            { key: "password", label: "Contraseña inicial", placeholder: "Mínimo 8 caracteres", type: "password" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 text-sm py-2 rounded-xl hover:bg-gray-50 transition">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2 rounded-xl transition">
              {mutation.isPending ? "Creando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MiEquipoPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [showAdd, setShowAdd]     = useState(false);
  const [creds, setCreds]         = useState<Credentials | null>(null);

  const { data: team, isLoading, isError } = useQuery({
    queryKey: ["mi-equipo"],
    queryFn: getTeam,
  });

  const resetMutation = useMutation({
    mutationFn: resetMemberPassword,
    onSuccess: (data) => setCreds(data),
  });

  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mi-equipo"] }),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi equipo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Usuarios con acceso al panel de tu organización.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition shrink-0"
        >
          + Agregar miembro
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      )}

      {isError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Esta función requiere configuración adicional en el servidor.
        </div>
      )}

      {team && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Usuario</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {team.map(member => (
                <tr key={member.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{member.username}</span>
                    {member.username === me?.username && (
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Tú</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{member.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => resetMutation.mutate(member.id)}
                        disabled={resetMutation.isPending}
                        className="text-xs text-yellow-600 hover:text-yellow-700 transition-colors"
                      >
                        Reset clave
                      </button>
                      {member.username !== me?.username && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Quitar a ${member.username} del equipo?`)) {
                              removeMutation.mutate(member.id);
                            }
                          }}
                          className="text-xs text-red-500 hover:text-red-600 transition-colors"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AgregarMiembroModal
          onClose={() => setShowAdd(false)}
          onCreated={(c) => { setShowAdd(false); setCreds(c); qc.invalidateQueries({ queryKey: ["mi-equipo"] }); }}
        />
      )}

      {creds && <CredencialesModal creds={creds} onClose={() => setCreds(null)} />}
    </div>
  );
}
