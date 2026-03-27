"use client";

import Link from "next/link";
import { useMe } from "@/features/auth/hooks";

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  pendiente_validacion: { label: "Pendiente de validación", color: "bg-yellow-100 text-yellow-800" },
  activo:              { label: "Aprobado",                 color: "bg-green-100 text-green-800" },
  rechazado:           { label: "Rechazado",                color: "bg-red-100 text-red-800" },
};

export default function MiInscripcionPage() {
  const { data: me, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Cargando…
      </div>
    );
  }

  if (isError || !me) {
    return (
      <div className="text-center py-24 text-red-500 text-sm">
        No se pudo cargar la información. Intenta de nuevo.
      </div>
    );
  }

  const nombre = me.participaciones[0]?.nombre_completo ?? me.username;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {nombre}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aquí puedes ver el estado de tus inscripciones.
        </p>
      </div>

      {/* Participaciones */}
      {me.participaciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No tienes participaciones registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {me.participaciones.map((p) => {
            const estado = ESTADO_LABEL[p.estado] ?? { label: p.estado, color: "bg-gray-100 text-gray-600" };
            const slug   = p["evento__slug"];
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{p["evento__nombre"]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.nombre_completo}</p>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estado.color}`}
                  >
                    {estado.label}
                  </span>
                </div>

                {p.estado === "activo" && (
                  <Link
                    href={`/mi-inscripcion/inscribirse/${slug}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
                  >
                    + Inscribirse en modalidad
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info card for pending */}
      {me.participaciones.some((p) => p.estado === "pendiente_validacion") && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Tu registro está siendo revisado por el organizador. Recibirás un correo cuando sea aprobado.
        </div>
      )}
    </div>
  );
}
