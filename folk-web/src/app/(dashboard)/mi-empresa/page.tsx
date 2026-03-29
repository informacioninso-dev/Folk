"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { OrganizadorDetalle } from "@/features/superadmin/types";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmpresaForm {
  nombre: string;
  email_contacto: string;
  telefono: string;
  direccion: string;
  sitio_web: string;
  descripcion: string;
  whatsapp_numero: string;
  whatsapp_mensaje: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

const getMiEmpresa = () =>
  apiClient.get<OrganizadorDetalle & {
    logo_url: string | null;
    direccion: string;
    descripcion: string;
    sitio_web: string;
    telefono: string;
    whatsapp_numero: string;
    whatsapp_mensaje: string;
  }>("/organizadores/mi-empresa/").then((r) => r.data);

const updateMiEmpresa = (data: Partial<EmpresaForm>) =>
  apiClient.patch("/organizadores/mi-empresa/", data).then((r) => r.data);

const uploadLogo = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("logo", file);
  const { data } = await apiClient.patch("/organizadores/mi-empresa/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.logo_url ?? "";
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MiEmpresaPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const { data: empresa, isLoading } = useQuery({
    queryKey: ["mi-empresa"],
    queryFn: getMiEmpresa,
  });

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<EmpresaForm>();

  useEffect(() => {
    if (empresa) {
      reset({
        nombre:           empresa.nombre           ?? "",
        email_contacto:   empresa.email_contacto   ?? "",
        telefono:         empresa.telefono          ?? "",
        direccion:        empresa.direccion         ?? "",
        sitio_web:        empresa.sitio_web         ?? "",
        descripcion:      empresa.descripcion       ?? "",
        whatsapp_numero:  empresa.whatsapp_numero   ?? "",
        whatsapp_mensaje: empresa.whatsapp_mensaje  ?? "",
      });
    }
  }, [empresa, reset]);

  const saveMutation = useMutation({
    mutationFn: updateMiEmpresa,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mi-empresa"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const logoMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mi-empresa"] }),
  });

  const onSubmit = (values: EmpresaForm) => saveMutation.mutate(values);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi empresa</h1>
        <p className="text-sm text-gray-500 mt-1">
          Esta información aparece en las páginas públicas de inscripción y ranking.
        </p>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Logo de la empresa</h2>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
            {empresa?.logo_url ? (
              <Image
                src={empresa.logo_url}
                alt="Logo"
                width={80}
                height={80}
                className="object-contain w-full h-full"
              />
            ) : (
              <span className="text-2xl text-gray-300">🏢</span>
            )}
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={logoMutation.isPending}
              className="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition"
            >
              {logoMutation.isPending ? "Subiendo…" : "Subir logo"}
            </button>
            <p className="text-xs text-gray-400 mt-1.5">PNG o JPG, máx 2 MB. Recomendado 200×200 px.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) logoMutation.mutate(file);
              }}
            />
          </div>
        </div>
      </div>

      {/* Datos de empresa */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Información general</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
            <input
              {...register("nombre")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email de contacto</label>
            <input
              {...register("email_contacto")}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              {...register("telefono")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="+593 99 000 0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sitio web</label>
            <input
              {...register("sitio_web")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
              placeholder="https://www.miempresa.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            {...register("direccion")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            placeholder="Av. Principal 123, Ciudad"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            {...register("descripcion")}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
            placeholder="Descripción breve de tu academia o empresa organizadora…"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saveMutation.isPending || !isDirty}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ Guardado</span>
          )}
        </div>
      </form>

      {/* WhatsApp de contacto */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Contacto WhatsApp</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Configura aquí tu número de WhatsApp. Podrás activar el botón de contacto en cada evento desde la pestaña Portal.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de WhatsApp
            <span className="text-gray-400 font-normal ml-1">(formato internacional, ej: 593999999999)</span>
          </label>
          <input
            {...register("whatsapp_numero")}
            placeholder="593999999999"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje predeterminado
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <textarea
            {...register("whatsapp_mensaje")}
            rows={2}
            placeholder="Hola, tengo una consulta sobre el evento…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Si lo dejas vacío, se usará un mensaje genérico con el nombre del evento.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saveMutation.isPending || !isDirty}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          {saved && <span className="text-sm text-green-600 font-medium">✓ Guardado</span>}
        </div>
      </form>
    </div>
  );
}
