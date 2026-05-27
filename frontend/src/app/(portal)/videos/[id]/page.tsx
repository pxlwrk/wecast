"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { VideoDetail } from "@/types";
import VideoPlayer from "@/components/media/VideoPlayer";
import {
  ArrowLeft, Clock, Share2, CheckCircle2, AlertCircle, Loader2,
  Video as VideoIcon, Copy, Check
} from "lucide-react";
import { formatDuration } from "@/lib/auth";

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    published:  "badge-published",
    processing: "badge-processing",
    error:      "badge-error",
    draft:      "badge-draft",
    uploading:  "badge-uploading",
    recording:  "badge-recording",
  };
  const labels: Record<string, string> = {
    published:  "Veröffentlicht",
    processing: "Verarbeitung läuft",
    error:      "Fehler",
    draft:      "Entwurf",
    uploading:  "Hochladen",
    recording:  "Aufnahme",
  };
  return <span className={cls[status] ?? "badge-pending"}>{labels[status] ?? status}</span>;
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [video,    setVideo]    = useState<VideoDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    api.videos.get(Number(id))
      .then(setVideo)
      .catch((err) => { if (err instanceof ApiError && err.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  async function copyEmbedCode() {
    const code = `<iframe src="${window.location.origin}/embed/video/${id}" width="800" height="450" title="${video?.title ?? "Video"}" allowfullscreen loading="lazy"></iframe>`;
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up max-w-4xl mx-auto">
        <div className="skeleton h-5 w-28" />
        <div className="skeleton aspect-video rounded-2xl" />
        <div className="space-y-2">
          <div className="skeleton h-7 w-2/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (notFound || !video) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Video nicht gefunden.</p>
        <Link href="/videos" className="btn-primary mt-4 inline-flex">Zurück</Link>
      </div>
    );
  }

  const isPlayable = video.status === "published" && !!video.hls_url;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-up">
      {/* Back */}
      <Link href="/videos" className="btn-ghost -ml-2 inline-flex">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Alle Videos
      </Link>

      {/* Player or placeholder */}
      {isPlayable ? (
        <VideoPlayer
          hlsUrl={video.hls_url!}
          subtitlesUrl={video.subtitles_url}
          title={video.title}
          thumbnail={video.thumbnail_url}
        />
      ) : (
        <div className="card aspect-video flex flex-col items-center justify-center gap-3
                        bg-zinc-100 dark:bg-zinc-900">
          {video.status === "processing" ? (
            <>
              <Loader2 className="w-10 h-10 text-zinc-400 animate-spin" aria-hidden="true" />
              <p className="text-sm text-zinc-500">Video wird verarbeitet…</p>
              <p className="text-xs text-zinc-400">Die Seite bitte nach einigen Minuten neu laden.</p>
            </>
          ) : video.status === "error" ? (
            <>
              <AlertCircle className="w-10 h-10 text-red-400" aria-hidden="true" />
              <p className="text-sm text-zinc-500">Bei der Verarbeitung ist ein Fehler aufgetreten.</p>
            </>
          ) : (
            <>
              <VideoIcon className="w-10 h-10 text-zinc-300" aria-hidden="true" />
              <p className="text-sm text-zinc-500">Video noch nicht verfügbar</p>
            </>
          )}
        </div>
      )}

      {/* Info */}
      <div className="space-y-3">
        <div className="flex items-start gap-3 justify-between flex-wrap">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{video.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusPill status={video.status} />
              {video.duration_sec && (
                <span className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  {formatDuration(video.duration_sec)}
                </span>
              )}
              {video.subtitles_url && (
                <span className="badge-done">Untertitel</span>
              )}
              {video.transcript_status === "done" && (
                <span className="badge-done">Transkript</span>
              )}
            </div>
          </div>

          {/* Share / Embed */}
          {isPlayable && (
            <button
              onClick={copyEmbedCode}
              className="btn-secondary flex-shrink-0"
              aria-label="Embed-Code kopieren"
            >
              {copied
                ? <><Check className="w-4 h-4 text-emerald-500" aria-hidden="true" /> Kopiert!</>
                : <><Copy  className="w-4 h-4" aria-hidden="true" /> Embed-Code</>}
            </button>
          )}
        </div>

        {video.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{video.description}</p>
        )}
      </div>

      {/* Processing status detail */}
      {video.status === "processing" && (
        <div className="card p-4 flex items-center gap-3
                        bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
          <Loader2 className="w-5 h-5 text-amber-500 flex-shrink-0 animate-spin" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Video wird verarbeitet</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              HLS-Transkodierung und Transkription laufen im Hintergrund.
              Die Seite nach einigen Minuten neu laden.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
