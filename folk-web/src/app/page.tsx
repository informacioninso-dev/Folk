import HomePageClient from "@/app/home-page-client";
import type { HomepageData, SiteConfigPublic } from "@/features/portal/api";

const DEFAULT_API_URL = "http://127.0.0.1:8000";

const DEFAULT_HOMEPAGE_DATA: HomepageData = {
  destacados: [],
  eventos: [],
};

const DEFAULT_SITE_CONFIG: SiteConfigPublic = {
  whatsapp_numero: "593999999999",
  whatsapp_mensaje: "Hola! Quiero mas informacion sobre Folk.",
};

function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  return (envUrl && envUrl.length > 0 ? envUrl : DEFAULT_API_URL).replace(/\/$/, "");
}

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/v1/${path}`, {
      cache: "no-store",
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export default async function Page() {
  const [homepageData, siteConfig] = await Promise.all([
    fetchJson<HomepageData>("homepage/", DEFAULT_HOMEPAGE_DATA),
    fetchJson<SiteConfigPublic>("site-config/", DEFAULT_SITE_CONFIG),
  ]);

  return (
    <HomePageClient
      initialData={homepageData}
      initialSiteConfig={{
        ...DEFAULT_SITE_CONFIG,
        ...siteConfig,
      }}
    />
  );
}
