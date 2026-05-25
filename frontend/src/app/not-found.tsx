import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="text-xl text-gray-600">Seite nicht gefunden</p>
      <Link
        href="/dashboard"
        className="mt-4 rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Zur Startseite
      </Link>
    </main>
  );
}
