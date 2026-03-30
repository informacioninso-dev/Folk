"use client";

import Link from "next/link";
import { useLogout } from "@/features/auth/hooks";

export default function ParticipanteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logout = useLogout();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-700">Folk</Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-700 transition-colors font-medium">
              Inicio
            </Link>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
