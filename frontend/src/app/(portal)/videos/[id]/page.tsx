"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { VideoDetail } from "@/types";
import VideoPlayer from "@/components/media/VideoPlayer";
import { ChevronLeft, Loader, AlertCircle } from "lucide-react";
import { formatDuration } from "@/lib/auth";

export default function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.videos.get(Number(id))
      .then(setVideo)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-gray-500 text-sm" aria-busy="true">Wird geladen…</p>;
  if (notFound || !video) return (
    <div className="text-center py-16">
      <p className="text-gray-500">Video nicht gefunden.</p>
      <Link href="/videos" className="mt-4 inline-block text-sm text-brand-600 hover:underline">Zurück zu Videos</Link>
    </div>
  );

  const isProcessing = video.status === "processing" || video.transcode_status === "processing";
  const hasError = video.status === "error";

  return (
    <div className="max-w-3xl">
      <Link href="/videos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Alle Videos
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>

      {isProcessing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <Loader className="w-4 h-4 text-yellow-600 animate-spin flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-yellow-800">Dieses Video wird gerade verarbeitet. Bitte einen Moment warten.</p>
        </div>
      )}

      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-700">Bei der Verarbeitung ist ein Fehler aufgetreten.</p>
        </div>
      )}

      {video.hls_url ? (
        <VideoPlayer
          hlsUrl={video.hls_url}
          subtitlesUrl={video.subtitles_url}
          title={video.title}
          thumbnail={video.thumbnail_url}
        />
      ) : (
        <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
          {video.thumbnail_url ? (
            <img src={video.thumbnail_url} alt="" aria-hidden="true" className="w-full h-full object-cover rounded-xl" />
          ) : (
            <p className="text-gray-400 text-sm">{isProcessing ? "Wird verarbeitet…" : "Kein Video verfügbar"}</p>
          )}
        </div>
      )}

      <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 space-y-2">
        {video.description && <p className="text-sm text-gray-700">{video.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          {video.duration_sec && <span>Dauer: {formatDuration(video.duration_sec)}</span>}
          <span>Status: {video.status}</span>
          {video.is_recording && <span className="text-purple-600">Bildschirmaufnahme</span>}
        </div>
        {(user?.role === "admin" || user?.role === "moderator") && video.status === "draft" && (
          <button
            onClick={async () => {
              await api.videos.update(video.id, { status: "published" });
              setVideo({ ...video, status: "published" });
            }}
            className="mt-2 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
          >
            Veröffentlichen
          </button>
        )}
      </div>
    </div>
  );
}
