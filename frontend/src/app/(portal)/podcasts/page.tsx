"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Show } from "@/types";
import { Mic2, Plus } from "lucide-react";

export default function PodcastsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.shows.list().then(setShows).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Podcast-Sendungen</h1>
        <Link
          href="/podcasts/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          aria-label="Neue Sendung erstellen"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Neue Sendung
        </Link>
      </div>

      {loading ? (
        <p aria-live="polite" aria-busy="true" className="text-gray-500 text-sm">
          Wird geladen…
        </p>
      ) : shows.length === 0 ? (
        <div className="text-center py-16">
          <Mic2 className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-500">Keine Sendungen vorhanden.</p>
          <Link href="/podcasts/new" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
            Erste Sendung erstellen
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
          {shows.map((show) => (
            <li key={show.id}>
              <Link
                href={`/podcasts/${show.slug}`}
                className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <div className="aspect-square bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
                  {show.cover_image_url ? (
                    <img
                      src={show.cover_image_url}
                      alt={`Cover von ${show.title}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Mic2 className="w-16 h-16 text-brand-300" aria-hidden="true" />
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-gray-900">{show.title}</h2>
                  {show.description && (
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{show.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
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
