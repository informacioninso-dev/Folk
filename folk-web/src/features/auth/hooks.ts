"use client";

import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login, requestPasswordReset, confirmPasswordReset, getMe } from "./api";
import type { LoginCredentials } from "./types";

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: (data) => {
      const session = data.session;
      if (session?.is_staff) router.push("/superadmin");
      else if (session?.is_participante) router.push("/mi-inscripcion");
      else if (session?.is_juez && !session.organizador_id) router.push("/calificar");
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
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogout() {
  return async () => {
    try {
      await axios.post("/api/auth/logout", undefined, { withCredentials: true });
    } finally {
      window.location.href = "/login";
    }
  };
}
