"use client";

import { useState } from "react";
import Link from "next/link";
import { useRequestPasswordReset } from "@/features/auth/hooks";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const mutation = useRequestPasswordReset();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700 tracking-tight">Folk</h1>
          <p className="text-sm text-gray-500 mt-1">Recuperar contraseña</p>
        </div>

        {mutation.isSuccess ? (
          <div className="space-y-4 text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-4 text-sm">
              Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
            </div>
            <Link href="/login" className="text-sm text-indigo-600 hover:underline block">
              ← Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-gray-500">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                placeholder="tu@correo.com"
              />
            </div>

            {mutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                Error al enviar. Intenta de nuevo.
              </div>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition text-sm"
            >
              {mutation.isPending ? "Enviando…" : "Enviar enlace"}
            </button>

            <Link href="/login" className="text-sm text-gray-500 hover:underline block text-center">
              ← Volver al inicio de sesión
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
