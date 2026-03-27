import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold text-gray-800">404 — Página no encontrada</h2>
      <p className="text-sm text-gray-500">La página que buscas no existe.</p>
      <Link
        href="/"
        className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
