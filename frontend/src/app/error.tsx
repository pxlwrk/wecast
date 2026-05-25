"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isNetworkError =
    error.message.includes("Load failed") ||
    error.message.includes("Failed to fetch") ||
    error.message.includes("NetworkError");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {isNetworkError ? "Backend nicht erreichbar" : "Ein Fehler ist aufgetreten"}
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          {isNetworkError
            ? "Das Backend (Port 8000) läuft nicht oder ist nicht erreichbar. Bitte starte uvicorn und lade die Seite neu."
            : error.message}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    </main>
  );
}
