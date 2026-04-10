import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export function useApi() {
  const { token } = useAuth();

  const request = useCallback(
    async <T = unknown>(
      path: string,
      options: RequestInit = {}
    ): Promise<T> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/api${path}`, {
        ...options,
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.status}`);
      }
      return res.json() as Promise<T>;
    },
    [token]
  );

  return { request };
}
