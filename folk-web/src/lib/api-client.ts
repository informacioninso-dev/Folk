import axios from "axios";
import Cookies from "js-cookie";

const ACCESS_COOKIE = "folk_access";
const REFRESH_COOKIE = "folk_refresh";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Adjunta el Bearer token a cada request
apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(ACCESS_COOKIE);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Si el token expiró (401), intenta refrescar y reintenta
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = Cookies.get(REFRESH_COOKIE);
      if (refresh) {
        try {
          const { data } = await axios.post(
            process.env.NEXT_PUBLIC_API_URL + "/api/v1/auth/token/refresh/",
            { refresh }
          );
          Cookies.set(ACCESS_COOKIE, data.access, { sameSite: "strict" });
          original.headers.Authorization = `Bearer ${data.access}`;
          return apiClient(original);
        } catch {
          clearAuthCookies();
          window.location.href = "/login";
        }
      } else {
        clearAuthCookies();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export function setAuthCookies(access: string, refresh: string) {
  // access: no httpOnly → el interceptor axios puede leerla
  Cookies.set(ACCESS_COOKIE, access, { sameSite: "strict", expires: 1 / 3 }); // 8h
  // refresh: expires en 7 días; en producción usar httpOnly vía Route Handler
  Cookies.set(REFRESH_COOKIE, refresh, { sameSite: "strict", expires: 7 });
}

export function clearAuthCookies() {
  Cookies.remove(ACCESS_COOKIE);
  Cookies.remove(REFRESH_COOKIE);
}

export function getAccessToken() {
  return Cookies.get(ACCESS_COOKIE);
}
