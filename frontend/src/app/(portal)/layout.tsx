"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Mic2, Video, Radio, Settings, LogOut, Home, Link2 } from "lucide-react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" aria-busy="true" aria-label="Wird geladen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" role="status">
          <span className="sr-only">Wird geladen…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const nav = [
    { href: "/dashboard", label: "Übersicht", icon: Home },
    { href: "/podcasts", label: "Podcasts", icon: Mic2 },
    { href: "/videos", label: "Videos", icon: Video },
    { href: "/record", label: "Aufnehmen", icon: Radio },
    { href: "/admin", label: "Verwaltung", icon: Settings, adminOnly: true },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Zum Hauptinhalt springen
      </a>

      {/* Sidebar */}
      <nav
        aria-label="Hauptnavigation"
        className="w-64 bg-white border-r border-gray-200 flex flex-col"
      >
        <div className="p-6 border-b border-gray-200">
          <Link href="/dashboard" aria-label="WeCast – Startseite">
            <span className="text-xl font-bold text-brand-700">WeCast</span>
          </Link>
        </div>

        <ul className="flex-1 p-4 space-y-1" role="list">
          {nav
            .filter((item) => !item.adminOnly || user.role === "admin")
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
        </ul>

        {/* User info + Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm"
            >
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.display_name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Abmelden"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Abmelden
          </button>
        </div>
      </nav>

      {/* Main */}
      <main id="main-content" className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
