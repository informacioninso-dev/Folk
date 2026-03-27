"use client";

import { useLogout, useMe } from "@/features/auth/hooks";

export default function JuezLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const { data: me } = useMe();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header — compacto y fijo para móvil */}
      <header className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <div>
              <span className="text-base font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Folk</span>
              <span className="ml-1.5 text-xs text-gray-400 font-medium">Panel de Juez</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Contenido — ancho limitado para móvil/tablet */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-5 pb-8">
        {children}
      </main>
    </div>
  );
}
