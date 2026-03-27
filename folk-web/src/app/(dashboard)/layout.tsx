"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLogout } from "@/features/auth/hooks";
import { useMe } from "@/features/auth/hooks";

const NAV = [
  { href: "/eventos",    label: "Eventos"    },
  { href: "/mi-empresa", label: "Mi empresa" },
  { href: "/mi-equipo",  label: "Mi equipo"  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout   = useLogout();
  const { data: me } = useMe();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Topbar */}
      <header className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="text-lg font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Folk</span>
            </div>
            <nav className="flex gap-1">
              {NAV.map(({ href, label }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-orange-50 text-orange-700 font-semibold"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {me?.username && (
              <span className="text-xs text-gray-400 hidden sm:block font-medium">{me.username}</span>
            )}
            <button
              onClick={logout}
              className="text-sm text-gray-400 hover:text-red-600 transition-colors font-medium"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
