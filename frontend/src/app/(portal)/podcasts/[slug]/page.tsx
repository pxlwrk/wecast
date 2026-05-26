"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { ShowDetail, Episode } from "@/types";
import { Mic2, UploadCloud, ChevronLeft, Clock, CheckCircle, AlertCircle, Loader } from "lucide-react";
import { formatDuration } from "@/lib/auth";

function EpisodeStatus({ status, transcriptStatus }: { status: string; transcriptStatus: string }) {
  if (status === "error") return <AlertCircle className="w-4 h-4 text-red-500" aria-label="Fehler" />;
  if (status === "processing" || transcriptStatus === "processing")
    return <Loader className="w-4 h-4 text-yellow-500 animate-spin" aria-label="Wird verarbeitet" />;
  if (status === "published") return <CheckCircle className="w-4 h-4 text-green-500" aria-label="Veröffentlicht" />;
  return <span className="w-4 h-4 rounded-full bg-gray-300 inline-block" aria-label="Entwurf" />;
}

export default function ShowDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { user } = useAuth();
  const [show, setShow] = useState<ShowDetail | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([api.shows.get(slug), api.shows.episodes(slug)])
      .then(([s, eps]) => { setShow(s); setEpisodes(eps); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <p className="text-gray-500 text-sm" aria-busy="true">Wird geladen…</p>;
  if (notFound || !show) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Sendung nicht gefunden.</p>
      <Link href="/podcasts" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Zurück zu Podcasts</Link>
    </div>
  );

  const canUpload = user?.role === "admin" || user?.role === "moderator";

  return (
    <div>
      <Link href="/podcasts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Alle Sendungen
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{show.title}</h1>
          {show.description && <p className="mt-1 text-gray-500">{show.description}</p>}
          <p className="mt-1 text-xs text-gray-400">{episodes.length} {episodes.length === 1 ? "Episode" : "Episoden"}</p>
        </div>
        {canUpload && (
          <Link
            href={`/podcasts/${slug}/upload`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            <UploadCloud className="w-4 h-4" aria-hidden="true" />
            Episode hochladen
          </Link>
        )}
      </div>

      {episodes.length === 0 ? (
        <div className="text-center py-16">
          <Mic2 className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-500">Noch keine Episoden vorhanden.</p>
        </div>
      ) : (
        <ul className="space-y-2" role="list" aria-label="Episodenliste">
          {episodes.map((ep) => (
            <li key={ep.id}>
              <Link
                href={`/podcasts/episode/${ep.id}`}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                <EpisodeStatus status={ep.status} transcriptStatus={ep.transcript_status} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{ep.title}</p>
                  {ep.description && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{ep.description}</p>
                  )}
                </div>
                {ep.duration_sec && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {formatDuration(ep.duration_sec)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
