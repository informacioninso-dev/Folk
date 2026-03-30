import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { publicApiClient } from "@/lib/public-api-client";
import type { LoginCredentials, LoginResponse, MeResponse } from "./types";

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  const { data } = await axios.post<LoginResponse>("/api/auth/login", credentials, {
    withCredentials: true,
  });
  return data;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/me/");
  return data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await publicApiClient.post("/auth/password-reset/", { email });
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  new_password: string
): Promise<void> {
  await publicApiClient.post("/auth/password-reset/confirm/", {
    uid,
    token,
    new_password,
  });
}
