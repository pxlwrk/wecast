/**
 * Layout for unauthenticated routes (login, etc.)
 * No navigation shell — just a centered card area.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      {children}
    </div>
  );
}
