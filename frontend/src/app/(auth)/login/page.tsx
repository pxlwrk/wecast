"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { Eye, EyeOff, Radio } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Benutzername oder Passwort ist falsch.");
      } else if (err instanceof ApiError && err.status === 503) {
        setError("LDAP-Dienst nicht erreichbar. Bitte versuchen Sie es später.");
      } else {
        setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 overflow-hidden">
      {/* Decorative mesh background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-48 -right-48 w-[500px] h-[500px] rounded-full
                        bg-brand-300/20 dark:bg-brand-900/20 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full
                        bg-violet-300/20 dark:bg-violet-900/20 blur-3xl" />
      </div>

      <a href="#login-form" className="skip-link">Zum Login-Formular springen</a>

      <div className="relative w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-brand-600 shadow-lg shadow-brand-500/30 mb-4">
            <Radio className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">WeCast</h1>
          <p className="mt-1 text-sm text-zinc-500">Unternehmensinternes Media-Portal</p>
        </div>

        {/* Form card */}
        <div className="card p-6 shadow-xl shadow-zinc-200/50 dark:shadow-black/40">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-5">
            Anmelden
          </h2>

          <form id="login-form" onSubmit={handleSubmit} noValidate aria-label="Anmeldeformular">
            {error && (
              <div role="alert" aria-live="assertive"
                className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20
                           border border-red-200 dark:border-red-800
                           text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="label">Benutzername</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  aria-required="true"
                  className="input"
                  placeholder="vorname.nachname"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Passwort</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    aria-required="true"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300
                               transition-colors"
                  >
                    {showPw
                      ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                      : <Eye    className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-disabled={loading}
              className="btn-primary w-full mt-6"
            >
              {loading ? (
                <>
                  <span
                    className="inline-block w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                    aria-hidden="true"
                  />
                  Anmelden…
                </>
              ) : "Anmelden"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          Melden Sie sich mit Ihren Active Directory-Zugangsdaten an.
        </p>
      </div>
    </div>
  );
}
