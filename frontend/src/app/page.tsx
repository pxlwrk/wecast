import { redirect } from "next/navigation";

/**
 * Root route — redirect to the portal dashboard.
 * The AuthProvider in layout.tsx will catch unauthenticated users
 * and send them to /login before they ever reach /dashboard.
 */
export default function RootPage() {
  redirect("/dashboard");
}
