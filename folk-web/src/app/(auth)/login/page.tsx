"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@/features/auth/hooks";

const schema = z.object({
  username: z.string().min(1, "Requerido"),
  password: z.string().min(1, "Requerido"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = (values: FormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-white items-center justify-center p-12">
        {/* Manchas decorativas */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-orange-400/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-teal-400/50 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-10 w-40 h-40 bg-yellow-300/50 rounded-full blur-2xl" />

        <div className="relative text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Folk" className="h-28 w-auto mx-auto mb-8" />
          <p className="text-gray-600 text-lg font-medium mb-10">Plataforma de concursos de baile</p>
          <div className="space-y-4 text-left max-w-xs mx-auto">
            {["Inscripciones online", "Calificaciones en tiempo real", "Ranking automático"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-gray-700 text-sm font-medium">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:max-w-md lg:w-full">
        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Folk" className="h-10 w-auto" />
        </div>

        <div className="w-full max-w-sm">
          {/* Encabezado */}
          <div className="mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Bienvenido</h2>
            <p className="text-gray-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Usuario */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Usuario
              </label>
              <input
                {...register("username")}
                type="text"
                autoComplete="username"
                placeholder="Tu usuario"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition bg-gray-50 hover:bg-white"
              />
              {errors.username && (
                <p className="text-xs text-red-500 mt-1.5">{errors.username.message}</p>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Contraseña
                </label>
                <Link href="/forgot-password" className="text-xs text-orange-500 hover:text-orange-700 font-medium transition">
                  ¿La olvidaste?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition bg-gray-50 hover:bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4.5 h-4.5 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Error servidor */}
            {loginMutation.isError && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Credenciales incorrectas. Intenta de nuevo.
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition shadow-md shadow-orange-200 text-sm tracking-wide"
            >
              {loginMutation.isPending ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            ¿Eres participante?{" "}
            <Link href="/" className="text-orange-500 hover:text-orange-700 font-medium transition">
              Ver eventos
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
