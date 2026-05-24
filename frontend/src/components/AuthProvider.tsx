"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/lib/auth";
import { api, setAccessToken } from "@/lib/api";
import type { CurrentUser } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session on mount via refresh cookie
  useEffect(() => {
    (async () => {
      try {
        const data = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (data.ok) {
          const token = await data.json();
          setAccessToken(token.access_token);
          const me = await api.users.me();
          setUser(me);
        }
      } catch {
        // No valid session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const token = await api.auth.login(username, password);
    setAccessToken(token.access_token);
    const me = await api.users.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
