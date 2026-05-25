"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthContext, type AuthContextValue } from "@/lib/auth";
import { api, setAccessToken } from "@/lib/api";
import type { CurrentUser } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendDown, setBackendDown] = useState(false);

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
        // Non-ok (401, 422) = no session, that's fine → go to login
      } catch (e) {
        // TypeError: Load failed / Failed to fetch → backend not reachable
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("Load failed") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
          setBackendDown(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setBackendDown(false);
    const token = await api.auth.login(username, password);
    setAccessToken(token.access_token);
    const me = await api.users.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore network errors on logout
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  if (backendDown) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="max-w-md">
          <p className="text-4xl mb-4">⚠️</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            Backend nicht erreichbar
          </h1>
          <p className="text-gray-500 text-sm mb-2">
            Der API-Server (Port 8000) antwortet nicht.
          </p>
          <pre className="text-left bg-gray-100 rounded p-3 text-xs text-gray-700 mb-6">
            cd backend{"\n"}
            uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }

  const value: AuthContextValue = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
