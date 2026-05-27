"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Show } from "@/types";
import { Mic2, Plus, Lock, Globe } from "lucide-react";

export default function PodcastsPage() {
  const [shows,   setShows]   = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.shows.list().then(setShows).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Podcast-Sendungen</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Verwalten Sie Ihre Sendungen und Episoden</p>
        </div>
        <Link href="/podcasts/new" className="btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Neue Sendung</span>
          <span className="sm:hidden">Neu</span>
        </Link>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton aspect-square" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          {/* Illustration placeholder */}
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-100 to-violet-100
                            dark:from-brand-900/30 dark:to-violet-900/20
                            flex items-center justify-center">
              <Mic2 className="w-10 h-10 text-brand-400" aria-hidden="true" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-brand-600
                            flex items-center justify-center shadow-md">
              <Plus className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Noch keine Sendungen</h2>
          <p className="mt-1.5 text-sm text-zinc-500 max-w-xs">
            Erstellen Sie Ihre erste Podcast-Sendung und laden Sie Episoden hoch.
          </p>
          <Link href="/podcasts/new" className="btn-primary mt-6">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Erste Sendung erstellen
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" role="list">
          {shows.map((show) => (
            <li key={show.id}>
              <Link
                href={`/podcasts/${show.slug}`}
                className="card-interactive group flex flex-col h-full"
              >
                {/* Cover art */}
                <div className="aspect-square bg-gradient-to-br from-brand-100 to-violet-50
                                dark:from-brand-900/30 dark:to-violet-900/20
                                overflow-hidden flex-shrink-0 relative">
                  {show.cover_image_url ? (
                    <img
                      src={show.cover_image_url}
                      alt={`Cover von ${show.title}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Mic2 className="w-12 h-12 text-brand-300 dark:text-brand-700" aria-hidden="true" />
                    </div>
                  )}
                  {/* Public/private badge */}
                  <span
                    aria-label={show.is_public ? "Öffentlich" : "Intern"}
                    className="absolute top-2 right-2 p-1.5 rounded-lg
                               bg-black/30 backdrop-blur-sm text-white"
                  >
                    {show.is_public
                      ? <Globe className="w-3 h-3" aria-hidden="true" />
                      : <Lock  className="w-3 h-3" aria-hidden="true" />}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
                    {show.title}
                  </h2>
                  {show.description && (
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2 flex-1">{show.description}</p>
                  )}
                  <p className="mt-2 text-xs font-medium text-zinc-400">
                    {show.episode_count} {show.episode_count === 1 ? "Episode" : "Episoden"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
