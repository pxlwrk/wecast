"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth";
import { Mic2, Video, Radio, Settings, LogOut, Home, Menu, X } from "lucide-react";

const ThemeToggle = dynamic(() => import("@/components/ui/ThemeToggle"), { ssr: false });

const NAV_ITEMS = [
  { href: "/dashboard", label: "Übersicht",  icon: Home },
  { href: "/podcasts",  label: "Podcasts",   icon: Mic2 },
  { href: "/videos",    label: "Videos",     icon: Video },
  { href: "/record",    label: "Aufnehmen",  icon: Radio },
];
const ADMIN_ITEMS = [
  { href: "/admin", label: "Verwaltung", icon: Settings },
];

function NavLink({
  href, label, icon: Icon, active, onClick,
}: { href: string; label: string; icon: React.ElementType; active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
        active
          ? "bg-brand-600 text-white shadow-sm shadow-brand-600/30"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
      ].join(" ")}
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Close drawer on navigation
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"
           aria-busy="true" aria-label="Wird geladen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center animate-pulse">
            <Radio className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <p className="text-sm text-zinc-500">Wird geladen…</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  const items = [...NAV_ITEMS, ...(user.role === "admin" ? ADMIN_ITEMS : [])];
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  const avatarLetter = user.display_name.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      <a href="#main-content" className="skip-link">Zum Hauptinhalt springen</a>

      {/* ══ Desktop sidebar (hidden on mobile) ══════════════════════════ */}
      <aside
        aria-label="Hauptnavigation"
        className="hidden md:flex w-60 flex-col fixed inset-y-0 left-0 z-40
                   bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          aria-label="WeCast – Startseite"
          className="flex items-center gap-3 px-5 py-[1.15rem]
                     border-b border-zinc-200 dark:border-zinc-800
                     hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center
                          shadow-sm shadow-brand-600/30 flex-shrink-0">
            <Radio className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">WeCast</span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {items.map((item) => (
            <NavLink key={item.href} {...item} icon={item.icon} active={isActive(item.href)} />
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div
              aria-hidden="true"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-700
                         flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
            >
              {avatarLetter}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.display_name}</p>
              <p className="text-xs text-zinc-500 truncate capitalize">{user.role}</p>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={logout}
            className="btn-ghost w-full justify-start text-xs"
            aria-label="Abmelden"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* ══ Mobile top bar ═══════════════════════════════════════════════ */}
      <header
        className="md:hidden fixed top-0 inset-x-0 z-50 h-14
                   bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md
                   border-b border-zinc-200 dark:border-zinc-800
                   flex items-center justify-between px-4"
      >
        <Link href="/dashboard" aria-label="WeCast – Startseite"
          className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">WeCast</span>
        </Link>

        <div className="flex items-center gap-0.5">
          <ThemeToggle />
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label={drawerOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
            className="btn-ghost p-2"
          >
            {drawerOpen
              ? <X    className="w-5 h-5" aria-hidden="true" />
              : <Menu className="w-5 h-5" aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* ══ Mobile drawer ════════════════════════════════════════════════ */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          {/* Slide-in panel */}
          <div
            id="mobile-drawer"
            role="dialog"
            aria-label="Navigation"
            className="md:hidden fixed top-14 right-0 bottom-0 z-50 w-72
                       bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800
                       flex flex-col animate-fade-up overflow-y-auto"
          >
            <nav className="flex-1 p-4 space-y-0.5">
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  {...item}
                  icon={item.icon}
                  active={isActive(item.href)}
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
            </nav>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-700
                                flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {avatarLetter}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.display_name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
                </div>
              </div>
              <button onClick={logout} className="btn-ghost w-full justify-start">
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Abmelden
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══ Page content ═════════════════════════════════════════════════ */}
      <main
        id="main-content"
        className="flex-1 min-w-0 md:ml-60 mt-14 md:mt-0 min-h-screen"
      >
        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
