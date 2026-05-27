"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import type { FeaturedContent } from "@/types";
import {
  Play, Mic2, Video as VideoIcon, Clock, ArrowRight,
  Shield, Cpu, Monitor, Users, Zap, Lock,
} from "lucide-react";
import { formatDuration } from "@/lib/auth";

// ── Feature cards ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Shield,
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    title: "Vollständig selbst gehostet",
    desc: "Ihre Medien bleiben auf Ihren Servern. Keine Cloud-Abhängigkeiten, keine externen Dienste.",
  },
  {
    icon: Cpu,
    color: "from-blue-500 to-cyan-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    title: "KI-Transkription lokal",
    desc: "Automatische Untertitel und Volltextsuche – powered by faster-whisper, komplett on-premise.",
  },
  {
    icon: Monitor,
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    title: "Screen Recorder integriert",
    desc: "Bildschirmaufnahmen direkt aus dem Browser – kein Loom, kein Zoom, keine externen Tools.",
  },
  {
    icon: Users,
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    title: "Active Directory Integration",
    desc: "Login mit Ihrem AD-Konto, granulare Zugriffssteuerung nach Abteilung oder Gruppe.",
  },
  {
    icon: Zap,
    color: "from-pink-500 to-rose-600",
    bg: "bg-pink-50 dark:bg-pink-900/20",
    title: "HLS-Streaming & Podcasts",
    desc: "Adaptives Streaming für Videos, RSS-Feeds für Podcasts – produktionsreif und performant.",
  },
  {
    icon: Lock,
    color: "from-zinc-600 to-zinc-800",
    bg: "bg-zinc-50 dark:bg-zinc-900/50",
    title: "Datenschutz by Design",
    desc: "DSGVO-konform, Audit-Logging, keine Tracking-Skripte, keine externen Fonts.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<FeaturedContent | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    fetch("/api/v1/public/featured")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setFeatured(data))
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
  }, []);

  const hasContent = !loadingFeatured && (
    (featured?.videos?.length ?? 0) > 0 || (featured?.shows?.length ?? 0) > 0
  );

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 dark:border-zinc-800/80
                          bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700
                            flex items-center justify-center flex-shrink-0 shadow-sm">
              <Play className="w-3.5 h-3.5 text-white fill-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg tracking-tight">WeCast</span>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="btn-primary text-sm px-4 py-2">
                Portal öffnen
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary text-sm px-4 py-2 hidden sm:inline-flex">
                  Anmelden
                </Link>
                <Link href="/login" className="btn-primary text-sm px-4 py-2">
                  Portal öffnen
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Gradient mesh background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px]
                           bg-gradient-radial from-violet-400/20 via-purple-400/10 to-transparent
                           rounded-full blur-3xl" />
          <div className="absolute top-20 -left-32 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
          <div className="absolute top-40 -right-32 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl" />
          {/* Grid dots pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.05]"
               xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                           bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300
                           text-xs font-medium mb-6 ring-1 ring-violet-200 dark:ring-violet-800">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" aria-hidden="true" />
            Enterprise Media Portal · Self-Hosted
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight
                          bg-gradient-to-br from-zinc-900 via-zinc-700 to-zinc-500
                          dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-500
                          bg-clip-text text-transparent pb-2">
            Ihr internes<br className="hidden sm:block" /> Media-Portal
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Podcasts, Videos und Screen-Aufnahmen – sicher verwaltet, KI-transkribiert
            und nach Abteilung freigegeben. Komplett selbst gehostet, ohne Kompromisse.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link href="/dashboard"
                className="btn-primary text-base px-6 py-3 shadow-lg shadow-violet-500/25">
                Portal öffnen
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link href="/login"
                  className="btn-primary text-base px-6 py-3 shadow-lg shadow-violet-500/25">
                  Jetzt anmelden
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link href="#features" className="btn-ghost text-base px-6 py-3">
                  Mehr erfahren
                </Link>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              { label: "Self-Hosted", value: "100 %" },
              { label: "Cloud-frei", value: "KI lokal" },
              { label: "DSGVO-konform", value: "✓" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Videos ──────────────────────────────────────────── */}
      {(loadingFeatured || (featured?.videos?.length ?? 0) > 0) && (
        <section className="py-16 bg-zinc-50/60 dark:bg-zinc-900/50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Aktuelle Videos</h2>
                <p className="text-sm text-zinc-500 mt-1">Öffentlich zugängliche Unternehmensvideos</p>
              </div>
              {user && (
                <Link href="/videos" className="btn-ghost text-sm flex-shrink-0">
                  Alle Videos
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            {loadingFeatured ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 animate-pulse">
                    <div className="aspect-video bg-zinc-300 dark:bg-zinc-700" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 bg-zinc-300 dark:bg-zinc-700 rounded w-3/4" />
                      <div className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" role="list">
                {featured?.videos.map((v) => {
                  const href = user ? `/videos/${v.id}` : "/login";
                  return (
                    <li key={v.id}>
                      <Link href={href}
                        className="group flex flex-col rounded-2xl overflow-hidden
                                   bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
                                   hover:border-brand-300 dark:hover:border-brand-700
                                   hover:shadow-lg hover:shadow-brand-500/10
                                   transition-all duration-200">
                        {/* Thumbnail */}
                        <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                          {v.thumbnail_url ? (
                            <img src={v.thumbnail_url} alt={v.title}
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <VideoIcon className="w-8 h-8 text-zinc-300" aria-hidden="true" />
                            </div>
                          )}
                          {v.duration_sec && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white
                                             text-xs px-1.5 py-0.5 rounded font-mono">
                              {formatDuration(v.duration_sec)}
                            </span>
                          )}
                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center
                                          bg-black/0 group-hover:bg-black/20 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm
                                            flex items-center justify-center
                                            opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100
                                            transition-all duration-200 shadow-lg">
                              <Play className="w-4 h-4 text-zinc-900 fill-zinc-900 ml-0.5" aria-hidden="true" />
                            </div>
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-3 flex-1">
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2
                                         group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {v.title}
                          </h3>
                          {v.description && (
                            <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{v.description}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── Featured Shows ───────────────────────────────────────────── */}
      {(loadingFeatured || (featured?.shows?.length ?? 0) > 0) && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Podcast-Sendungen</h2>
                <p className="text-sm text-zinc-500 mt-1">Unternehmenspodcasts zum Reinhören</p>
              </div>
              {user && (
                <Link href="/podcasts" className="btn-ghost text-sm flex-shrink-0">
                  Alle Sendungen
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            {loadingFeatured ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                    <div className="mt-2 h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-4/5" />
                    <div className="mt-1.5 h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/5" />
                  </div>
                ))}
              </div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" role="list">
                {featured?.shows.map((s) => {
                  const href = user ? `/podcasts/${s.slug}` : "/login";
                  return (
                    <li key={s.id}>
                      <Link href={href} className="group block">
                        {/* Cover */}
                        <div className="aspect-square rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800
                                        ring-1 ring-zinc-200 dark:ring-zinc-700
                                        group-hover:ring-brand-400 dark:group-hover:ring-brand-600
                                        group-hover:shadow-lg group-hover:shadow-brand-500/10
                                        transition-all duration-200">
                          {s.cover_image_url ? (
                            <img src={s.cover_image_url} alt={s.title}
                                 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center
                                            bg-gradient-to-br from-violet-100 to-purple-100
                                            dark:from-violet-900/30 dark:to-purple-900/20">
                              <Mic2 className="w-8 h-8 text-violet-400" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="mt-2.5 px-0.5">
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2
                                         group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {s.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {s.episode_count} {s.episode_count === 1 ? "Episode" : "Episoden"}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* ── Empty state: no public content ──────────────────────────── */}
      {!loadingFeatured && !hasContent && (
        <section className="py-20">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800
                            flex items-center justify-center mx-auto mb-4">
              <Play className="w-7 h-7 text-zinc-300" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
              Noch keine öffentlichen Inhalte
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500">
              Öffentliche Videos und Sendungen erscheinen hier.
            </p>
            {!user && (
              <Link href="/login" className="btn-primary mt-6 inline-flex">
                Zum Portal anmelden
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-zinc-50/60 dark:bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Enterprise-Qualität, vollständig in Ihrer Hand
            </h2>
            <p className="mt-3 text-zinc-500 max-w-xl mx-auto">
              Alle Funktionen, die Ihr Team braucht – ohne Abhängigkeit von externen Diensten.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
              <div key={title}
                className="group p-6 rounded-2xl bg-white dark:bg-zinc-900
                           border border-zinc-200 dark:border-zinc-800
                           hover:border-zinc-300 dark:hover:border-zinc-700
                           hover:shadow-md transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                  <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${color}
                                   flex items-center justify-center`}>
                    <Icon className="w-3 h-3 text-white" aria-hidden="true" />
                  </div>
                </div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">{title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────── */}
      {!user && (
        <section className="py-20">
          <div className="max-w-3xl mx-auto px-4">
            <div className="relative overflow-hidden rounded-3xl p-10 text-center
                            bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700
                            shadow-2xl shadow-violet-500/30">
              {/* Decorative orbs */}
              <div className="pointer-events-none absolute -top-8 -left-8 w-40 h-40
                               bg-white/10 rounded-full blur-2xl" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-8 -right-8 w-40 h-40
                               bg-white/10 rounded-full blur-2xl" aria-hidden="true" />

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                Bereit für Ihr Media-Portal?
              </h2>
              <p className="text-violet-200 max-w-md mx-auto mb-8">
                Melden Sie sich mit Ihrem Active Directory-Konto an und verwalten
                Sie Ihre Unternehmensmedien sicher und datenschutzkonform.
              </p>
              <Link href="/login"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl
                           bg-white text-violet-700 font-semibold text-sm
                           hover:bg-violet-50 transition-colors shadow-lg">
                Jetzt anmelden
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center
                        justify-between gap-4 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-purple-700
                            flex items-center justify-center">
              <Play className="w-2.5 h-2.5 text-white fill-white" aria-hidden="true" />
            </div>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">WeCast</span>
            <span>·</span>
            <span>Enterprise Media Portal</span>
          </div>
          <span>Self-Hosted · Datenschutzkonform · DSGVO</span>
        </div>
      </footer>
    </div>
  );
}
