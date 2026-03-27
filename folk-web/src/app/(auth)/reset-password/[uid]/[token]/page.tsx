"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import { useConfirmPasswordReset } from "@/features/auth/hooks";

export default function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [clientError, setClientError] = useState("");
  const mutation = useConfirmPasswordReset();
  const serverError = axios.isAxiosError(mutation.error)
    ? (() => {
        const data = mutation.error.response?.data as
          | { detail?: string; new_password?: string[] }
          | undefined;
        if (data?.new_password?.length) return data.new_password.join(" ");
        return data?.detail ?? "El enlace ha expirado o es invalido. Solicita uno nuevo.";
      })()
    : "El enlace ha expirado o es invalido. Solicita uno nuevo.";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError("");
    if (password !== confirm) {
      setClientError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setClientError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    mutation.mutate({ uid, token, new_password: password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700 tracking-tight">Folk</h1>
          <p className="text-sm text-gray-500 mt-1">Nueva contraseña</p>
        </div>

        {mutation.isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-4 text-sm">
              Contraseña restablecida correctamente.
            </div>
            <Link href="/login" className="text-sm text-indigo-600 hover:underline block">
              Ir al inicio de sesión →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                placeholder="Repite la contraseña"
              />
            </div>

            {(clientError || mutation.isError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                {clientError || serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition text-sm"
            >
              {mutation.isPending ? "Guardando…" : "Establecer contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
