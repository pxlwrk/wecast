"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { EpisodeDetail } from "@/types";
import AudioPlayer from "@/components/media/AudioPlayer";
import { ChevronLeft, Loader } from "lucide-react";

export default function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.episodes.get(Number(id))
      .then(setEpisode)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500 text-sm" aria-busy="true">Wird geladen…</p>;
  if (notFound || !episode) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Episode nicht gefunden.</p>
      <Link href="/podcasts" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Zurück zu Podcasts</Link>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <Link href="/podcasts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Alle Sendungen
      </Link>

      {episode.status === "processing" || episode.transcript_status === "processing" ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <Loader className="w-4 h-4 text-yellow-600 animate-spin flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-yellow-800">Diese Episode wird gerade verarbeitet und transkribiert.</p>
        </div>
      ) : null}

      {episode.audio_url ? (
        <AudioPlayer episode={episode} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">{episode.title}</h2>
          {episode.description && <p className="text-sm text-gray-500">{episode.description}</p>}
          <p className="mt-4 text-sm text-gray-400">Keine Audiodatei verfügbar.</p>
        </div>
      )}

      {episode.summary && (
        <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 mb-2">KI-Zusammenfassung</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{episode.summary}</p>
        </div>
      )}
    </div>
  );
}
