"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * Persisted dark/light toggle.
 * Reads initial state from <html> class (set by the inline script in layout.tsx).
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("wecast-theme", next ? "dark" : "light"); } catch {}
  }

  if (dark === null) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Helles Design aktivieren" : "Dunkles Design aktivieren"}
      className="btn-ghost p-2 rounded-xl"
    >
      {dark
        ? <Sun  className="w-4 h-4" aria-hidden="true" />
        : <Moon className="w-4 h-4" aria-hidden="true" />}
    </button>
  );
}
