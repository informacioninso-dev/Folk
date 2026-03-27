import axios from "axios";
import { apiClient } from "@/lib/api-client";
import type { LoginCredentials, TokenPair, MeResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function login(credentials: LoginCredentials): Promise<TokenPair> {
  const { data } = await axios.post<TokenPair>(
    `${BASE}/api/v1/auth/token/`,
    credentials
  );
  return data;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await apiClient.get<MeResponse>("/me/");
  return data;
}

export async function requestPasswordReset(email: string): Promise<void> {
  await axios.post(`${BASE}/api/v1/auth/password-reset/`, { email });
}

export async function confirmPasswordReset(
  uid: string,
  token: string,
  new_password: string
): Promise<void> {
  await axios.post(`${BASE}/api/v1/auth/password-reset/confirm/`, {
    uid,
    token,
    new_password,
  });
}
