"use client";

export interface PrivacyConsentState {
  acepta_politica_privacidad: boolean;
  es_menor_edad: boolean;
  acepta_como_representante_legal: boolean;
  nombre_representante_legal: string;
  cedula_representante_legal: string;
}

interface PrivacyConsentProps {
  value: PrivacyConsentState;
  onChange: (next: PrivacyConsentState) => void;
  notice: string;
  policyUrl: string;
  version: string;
  contactEmail: string;
  theme?: "light" | "dark";
  forceRepresentative?: boolean;
}

const themeStyles = {
  light: {
    card: "bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3",
    title: "text-sm font-semibold text-slate-800",
    text: "text-sm text-slate-600",
    link: "text-indigo-600 hover:text-indigo-700 font-medium",
    input:
      "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition",
    checkbox: "text-indigo-600 focus:ring-indigo-500",
    muted: "text-xs text-slate-500",
  },
  dark: {
    card: "bg-gray-900 border border-white/10 rounded-2xl p-5 space-y-3",
    title: "text-sm font-semibold text-gray-200",
    text: "text-sm text-gray-400",
    link: "text-indigo-400 hover:text-indigo-300 font-medium",
    input:
      "w-full px-3 py-2.5 bg-gray-800 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition",
    checkbox: "text-indigo-500 focus:ring-indigo-500/40 bg-gray-800 border-white/10 rounded",
    muted: "text-xs text-gray-500",
  },
} as const;

export function createPrivacyConsentState(): PrivacyConsentState {
  return {
    acepta_politica_privacidad: false,
    es_menor_edad: false,
    acepta_como_representante_legal: false,
    nombre_representante_legal: "",
    cedula_representante_legal: "",
  };
}

export function validatePrivacyConsent(
  value: PrivacyConsentState,
  options?: { requiresRepresentative?: boolean }
): string | null {
  if (!value.acepta_politica_privacidad) {
    return "Debes aceptar el aviso de privacidad para continuar.";
  }

  const requiresRepresentative = Boolean(options?.requiresRepresentative || value.es_menor_edad);
  if (!requiresRepresentative) {
    return null;
  }

  if (!value.acepta_como_representante_legal) {
    return "Debes confirmar que actuas como representante legal del menor de edad.";
  }
  if (!value.nombre_representante_legal.trim()) {
    return "Ingresa el nombre del representante legal.";
  }
  if (!value.cedula_representante_legal.trim()) {
    return "Ingresa la cedula del representante legal.";
  }
  return null;
}

export default function PrivacyConsent({
  value,
  onChange,
  notice,
  policyUrl,
  version,
  contactEmail,
  theme = "light",
  forceRepresentative = false,
}: PrivacyConsentProps) {
  const styles = themeStyles[theme];
  const showRepresentative = forceRepresentative || value.es_menor_edad;

  function patch(next: Partial<PrivacyConsentState>) {
    onChange({ ...value, ...next });
  }

  return (
    <section className={styles.card}>
      <div className="space-y-1.5">
        <p className={styles.title}>Privacidad y tratamiento de datos</p>
        <p className={styles.text}>{notice}</p>
        <p className={styles.muted}>
          Version {version}. Contacto para derechos ARCO y consultas:{" "}
          <a href={`mailto:${contactEmail}`} className={styles.link}>
            {contactEmail}
          </a>
          .
        </p>
        <p className={styles.muted}>
          <a href={policyUrl} target="_blank" rel="noreferrer" className={styles.link}>
            Leer politica de privacidad completa
          </a>
        </p>
      </div>

      <label className={`flex items-start gap-3 ${styles.text}`}>
        <input
          type="checkbox"
          checked={value.acepta_politica_privacidad}
          onChange={(e) => patch({ acepta_politica_privacidad: e.target.checked })}
          className={`mt-0.5 ${styles.checkbox}`}
        />
        <span>He leido el aviso de privacidad y autorizo el tratamiento de mis datos para este evento.</span>
      </label>

      {!forceRepresentative && (
        <label className={`flex items-start gap-3 ${styles.text}`}>
          <input
            type="checkbox"
            checked={value.es_menor_edad}
            onChange={(e) =>
              patch({
                es_menor_edad: e.target.checked,
                acepta_como_representante_legal: e.target.checked
                  ? value.acepta_como_representante_legal
                  : false,
                nombre_representante_legal: e.target.checked
                  ? value.nombre_representante_legal
                  : "",
                cedula_representante_legal: e.target.checked
                  ? value.cedula_representante_legal
                  : "",
              })
            }
            className={`mt-0.5 ${styles.checkbox}`}
          />
          <span>Estoy registrando a un menor de edad o actuando como su representante legal.</span>
        </label>
      )}

      {showRepresentative && (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className={styles.text}>Nombre del representante legal</span>
            <input
              value={value.nombre_representante_legal}
              onChange={(e) => patch({ nombre_representante_legal: e.target.value })}
              className={styles.input}
              placeholder="Nombre completo"
            />
          </label>
          <label className="block space-y-1">
            <span className={styles.text}>Cedula del representante legal</span>
            <input
              value={value.cedula_representante_legal}
              onChange={(e) => patch({ cedula_representante_legal: e.target.value })}
              className={styles.input}
              placeholder="0912345678"
            />
          </label>
          <label className={`flex items-start gap-3 ${styles.text}`}>
            <input
              type="checkbox"
              checked={value.acepta_como_representante_legal}
              onChange={(e) => patch({ acepta_como_representante_legal: e.target.checked })}
              className={`mt-0.5 ${styles.checkbox}`}
            />
            <span>Confirmo que actuo como representante legal del menor de edad para este tramite.</span>
          </label>
        </div>
      )}
    </section>
  );
}

