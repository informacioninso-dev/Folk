"use client";

import Link from "next/link";
import { useLogout, useMe } from "@/features/auth/hooks";

export default function JuezLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const { data: me } = useMe();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Folk" className="h-7 w-auto" />
            <span className="text-xs text-gray-400 font-medium">Panel de Juez</span>
          </Link>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium">
              Inicio
            </Link>
            {me?.username && (
              <span className="text-xs text-gray-500 font-medium hidden sm:block">{me.username}</span>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors font-medium active:text-red-600"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 pb-8">
        {children}
      </main>
    </div>
  );
}
