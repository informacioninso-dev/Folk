"use client";

import Link from "next/link";

export default function InscripcionesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Inscripciones</h1>
      <p className="text-gray-500 mb-6">
        Selecciona un evento para ver sus inscripciones por categoría.
      </p>
      <Link
        href="/eventos"
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
      >
        Ver Eventos
      </Link>
    </div>
  );
}
