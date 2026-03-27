"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login, requestPasswordReset, confirmPasswordReset, getMe } from "./api";
import { setAuthCookies, clearAuthCookies, getAccessToken } from "@/lib/api-client";
import { decodeJwt } from "@/lib/jwt";
import type { LoginCredentials } from "./types";

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (data) => {
      setAuthCookies(data.access, data.refresh);
      const payload = decodeJwt(data.access);
      if (payload?.is_staff) router.push("/superadmin");
      else if (payload?.is_participante) router.push("/mi-inscripcion");
      else router.push("/eventos");
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (data: { uid: string; token: string; new_password: string }) =>
      confirmPasswordReset(data.uid, data.token, data.new_password),
  });
}

export function useMe() {
  const hasToken = !!getAccessToken();
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken,
    staleTime: 60_000,
  });
}

export function useLogout() {
  return () => {
    clearAuthCookies();
    window.location.href = "/login";
  };
}
