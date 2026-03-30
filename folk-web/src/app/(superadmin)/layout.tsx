"use client";

import Link from "next/link";
import { useLogout } from "@/features/auth/hooks";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 min-h-14 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="text-lg font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Folk</span>
            </Link>
            <span className="text-xs bg-gradient-to-r from-orange-500 to-red-600 text-white px-2.5 py-0.5 rounded-full font-semibold">
              SuperAdmin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 transition hover:bg-orange-100"
            >
              Inicio
            </Link>
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-red-600 transition-colors font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
