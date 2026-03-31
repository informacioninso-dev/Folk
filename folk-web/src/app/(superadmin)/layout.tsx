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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Folk" className="h-7 w-auto" />
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
