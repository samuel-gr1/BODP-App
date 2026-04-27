import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export type UserRole = "ADMIN" | "APPROVER" | "SECRETARY" | "USER" | "OBSERVER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = "zemen_auth_token";
const AUTH_USER_KEY = "zemen_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Get token from secure storage
        const storedToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(AUTH_USER_KEY);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
          } else {
            await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
            await AsyncStorage.removeItem(AUTH_USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Login failed");
    }

    const data = await res.json();

    // Extract token from set-cookie header (auth-token=...)
    const setCookie = res.headers.get("set-cookie");
    let authToken: string | null = null;
    
    if (setCookie) {
      // Parse auth-token from cookie string
      const tokenMatch = setCookie.match(/auth-token=([^;]+)/);
      if (tokenMatch) {
        authToken = tokenMatch[1];
      }
    }
    
    // Fallback for testing
    if (!authToken) {
      authToken = `session-${Date.now()}`;
    }
    
    setUser(data.user);
    setToken(authToken);
    // Store token securely
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, authToken);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    // Remove token from secure storage
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
