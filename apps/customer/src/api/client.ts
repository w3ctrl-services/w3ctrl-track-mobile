/**
 * Authenticated fetch for the few Traccar endpoints the @w3ctrl/api package
 * does not wrap (TOTP generation, permission reads). Uses the same Bearer
 * token the api package's token provider serves.
 */
import * as SecureStore from "expo-secure-store";
import { API_BASE, TraccarError } from "@w3ctrl/api";

async function authHeaders(
  init?: RequestInit,
): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync("w3ctrl_token");
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
}

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: await authHeaders(init),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TraccarError(res.status, body || `Request failed (${res.status})`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function authedText(path: string, init?: RequestInit): Promise<string> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: await authHeaders(init),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TraccarError(res.status, body || `Request failed (${res.status})`);
  }
  return res.text();
}
