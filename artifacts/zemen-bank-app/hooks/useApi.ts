import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Platform, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as WebBrowser from "expo-web-browser";

// Use the API URL directly - it should include the full base path including /api if needed
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

export function useApi() {
  const { token, logout } = useAuth();

  const request = useCallback(
    async <T = unknown>(
      path: string,
      options: RequestInit = {}
    ): Promise<T> => {
      if (!API_BASE) {
        throw new Error("API URL not configured. Please set EXPO_PUBLIC_API_URL in .env");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `${API_BASE}${path}`;

      try {
        const res = await fetch(url, {
          ...options,
          headers,
        });

        // Auto-logout on token expiry (401 Unauthorized)
        if (res.status === 401) {
          await logout();
          throw new Error("Session expired. Please log in again.");
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed: ${res.status}`);
        }
        return res.json() as Promise<T>;
      } catch (error: any) {
        if (error.message?.includes("Network request failed")) {
          throw new Error(`Cannot connect to server at ${API_BASE}. Please check your network and API URL.`);
        }
        throw error;
      }
    },
    [token, logout]
  );

  // Download file (handles binary data, not JSON)
  const downloadFile = useCallback(
    async (path: string, filename: string): Promise<void> => {
      if (!API_BASE) {
        throw new Error("API URL not configured. Please set EXPO_PUBLIC_API_URL in .env");
      }

      const url = `${API_BASE}${path}`;

      try {
        // For web platform, use the browser download method
        if (Platform.OS === "web") {
          const headers: Record<string, string> = {};
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch(url, {
            method: "GET",
            headers,
          });

          if (res.status === 401) {
            await logout();
            throw new Error("Session expired. Please log in again.");
          }
          if (!res.ok) {
            throw new Error(`Download failed: ${res.status}`);
          }

          // Get blob data
          const blob = await res.blob();
          
          // Create download link
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(downloadUrl);
        } else {
          // For native platforms, open document URL in browser with auth token
          try {
            // Add token as query parameter for authenticated access
            const authUrl = token 
              ? `${url}?access_token=${encodeURIComponent(token)}` 
              : url;
            
            await WebBrowser.openBrowserAsync(authUrl);
          } catch (error: any) {
            Alert.alert(
              "Cannot Open Document",
              `Unable to open ${filename} in browser. Please try again.`,
              [{ text: "OK" }]
            );
          }
        }
      } catch (error: any) {
        console.error("Download error:", error);
        throw error;
      }
    },
    [token, logout]
  );

  return { request, downloadFile };
}
