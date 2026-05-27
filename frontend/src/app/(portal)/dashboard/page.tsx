"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Show, Video } from "@/types";
import { Mic2, Video as VideoIcon, Radio, ArrowRight, Plus, Clock } from "lucide-react";
import { formatDuration } from "@/lib/auth";

export default function DashboardPage() {
  const [shows,  setShows]  = useState<Show[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.shows.list(), api.videos.list()])
      .then(([s, v]) => { setShows(s); setVideos(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalEpisodes = shows.reduce((n, s) => n + (s.episode_count ?? 0), 0);
  const recentVideos  = videos.slice(0, 4);

  const stats = [
    { label: "Podcast-Sendungen", value: shows.length,    href: "/podcasts", icon: Mic2,     color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { label: "Episoden gesamt",   value: totalEpisodes,   href: "/podcasts", icon: Radio,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Videos",            value: videos.length,   href: "/videos",   icon: VideoIcon, color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20" },
  ];

  const quickActions = [
    { href: "/podcasts/new",  label: "Neue Sendung",          desc: "Podcast-Sendung erstellen",     icon: Plus,      color: "bg-violet-600" },
    { href: "/videos/upload", label: "Video hochladen",       desc: "MP4, MOV oder WebM",             icon: VideoIcon, color: "bg-blue-600" },
    { href: "/record",        label: "Bildschirm aufnehmen",  desc: "Loom-artiger Screen Recorder",  icon: Radio,     color: "bg-emerald-600" },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Übersicht</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Willkommen im WeCast Media-Portal</p>
      </div>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href}
              className="card-interactive group p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {loading ? <span className="skeleton inline-block w-10 h-8 align-bottom" /> : s.value}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
                </div>
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${s.bg}`}>
                  <Icon className={`w-5 h-5 ${s.color}`} aria-hidden="true" />
                </div>
              </div>
              <span className="mt-4 flex items-center gap-1 text-xs text-zinc-400
                               group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                Alle anzeigen
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      <section aria-labelledby="quick-label">
        <h2 id="quick-label" className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Schnellzugriff
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-4 card p-4 group
                           hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
                <div className={`w-10 h-10 rounded-xl ${a.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100
                                group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {a.label}
                  </p>
                  <p className="text-xs text-zinc-500">{a.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Recent videos ─────────────────────────────────────────── */}
      {!loading && recentVideos.length > 0 && (
        <section aria-labelledby="recent-label">
          <div className="flex items-center justify-between mb-3">
            <h2 id="recent-label" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Neueste Videos
            </h2>
            <Link href="/videos"
              className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline">
              Alle <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="list">
            {recentVideos.map((v) => (
              <li key={v.id}>
                <Link href={`/videos/${v.id}`} className="card-interactive group flex flex-col h-full">
                  <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                    {v.thumbnail_url
                      ? <img src={v.thumbnail_url} alt="" aria-hidden="true"
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <VideoIcon className="w-7 h-7 text-zinc-300" aria-hidden="true" />
                        </div>}
                    {v.duration_sec && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white
                                       text-xs px-1.5 py-0.5 rounded font-mono">
                        {formatDuration(v.duration_sec)}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">{v.title}</p>
                    {v.duration_sec && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {formatDuration(v.duration_sec)}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Recent shows (only if any exist) ──────────────────────── */}
      {!loading && shows.length > 0 && (
        <section aria-labelledby="shows-label">
          <div className="flex items-center justify-between mb-3">
            <h2 id="shows-label" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Podcast-Sendungen
            </h2>
            <Link href="/podcasts"
              className="flex items-center gap-1 text-sm text-brand-600 dark:text-brand-400 hover:underline">
              Alle <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="list">
            {shows.slice(0, 4).map((s) => (
              <li key={s.id}>
                <Link href={`/podcasts/${s.slug}`} className="card-interactive group flex flex-col h-full">
                  <div className="aspect-square bg-gradient-to-br from-brand-100 to-violet-50
                                  dark:from-brand-900/30 dark:to-violet-900/20 overflow-hidden">
                    {s.cover_image_url
                      ? <img src={s.cover_image_url} alt={`Cover: ${s.title}`}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Mic2 className="w-10 h-10 text-brand-300 dark:text-brand-700" aria-hidden="true" />
                        </div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{s.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {s.episode_count} {s.episode_count === 1 ? "Episode" : "Episoden"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
