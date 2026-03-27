import axios from "axios";

export const apiClient = axios.create({
  baseURL: "/api/proxy",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
        });
      } catch {
        // Si el logout falla, igual redirigimos para cortar la sesión local.
      }

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);
