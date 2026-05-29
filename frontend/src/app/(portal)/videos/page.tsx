"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Video } from "@/types";
import { Video as VideoIcon, Plus, Clock, LayoutGrid, List } from "lucide-react";
import { formatDuration } from "@/lib/auth";

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    published: "badge-published",
    processing: "badge-processing",
    error: "badge-error",
    draft: "badge-draft",
    uploading: "badge-uploading",
    recording: "badge-recording",
  };
  const labels: Record<string, string> = {
    published:  "Veröffentlicht",
    processing: "Verarbeitung",
    error:      "Fehler",
    draft:      "Entwurf",
    uploading:  "Hochladen",
    recording:  "Aufnahme",
  };
  return (
    <span className={cls[status] ?? "badge-pending"}>
      {labels[status] ?? status}
    </span>
  );
}

export default function VideosPage() {
  const [videos,  setVideos]  = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<"grid" | "list">("grid");

  useEffect(() => {
    api.videos.list().then(setVideos).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Videos</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Hochladen, verwalten und teilen</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* View toggle (sm+) */}
          <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-0.5">
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={v === "grid" ? "Rasteransicht" : "Listenansicht"}
                aria-pressed={view === v}
                className={[
                  "p-1.5 rounded-lg transition-colors",
                  view === v
                    ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
                ].join(" ")}
              >
                {v === "grid"
                  ? <LayoutGrid className="w-4 h-4" aria-hidden="true" />
                  : <List       className="w-4 h-4" aria-hidden="true" />}
              </button>
            ))}
          </div>

          <Link href="/videos/upload" className="btn-primary">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Video hochladen</span>
            <span className="sm:hidden">Hochladen</span>
          </Link>
        </div>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className={view === "grid"
          ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
          : "space-y-3"}>
          {[...Array(8)].map((_, i) => (
            <div key={i} className={view === "list" ? "card p-4 flex gap-4" : "card overflow-hidden"}>
              {view === "list" ? (
                <><div className="skeleton w-32 h-20 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-3 w-24" />
                  </div></>
              ) : (
                <><div className="skeleton aspect-video" />
                  <div className="p-3 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/3" />
                  </div></>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-sky-50
                            dark:from-blue-900/30 dark:to-sky-900/20
                            flex items-center justify-center">
              <VideoIcon className="w-10 h-10 text-blue-400" aria-hidden="true" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-blue-600
                            flex items-center justify-center shadow-md">
              <Plus className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
          </div>
          <h2 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">Noch keine Videos</h2>
          <p className="mt-1.5 text-sm text-zinc-500 max-w-xs">
            Laden Sie Ihr erstes Video hoch oder nehmen Sie Ihren Bildschirm auf.
          </p>
          <Link href="/videos/upload" className="btn-primary mt-6">
            <Plus className="w-4 h-4" aria-hidden="true" />
            Video hochladen
          </Link>
        </div>
      )}

      {/* Grid view */}
      {!loading && videos.length > 0 && view === "grid" && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" role="list" aria-label="Videoliste">
          {videos.map((v) => (
            <li key={v.id}>
              <Link href={`/videos/${v.id}`} className="card-interactive group flex flex-col h-full">
                {/* Thumbnail */}
                <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" aria-hidden="true"
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
                </div>
                {/* Info */}
                <div className="p-3 flex flex-col flex-1">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">{v.title}</h2>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <StatusBadge status={v.status} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* List view */}
      {!loading && videos.length > 0 && view === "list" && (
        <ul className="space-y-2" role="list" aria-label="Videoliste">
          {videos.map((v) => (
            <li key={v.id}>
              <Link
                href={`/videos/${v.id}`}
                className="flex items-center gap-4 card p-4 group
                           hover:border-brand-200 dark:hover:border-brand-800 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-28 h-16 sm:w-36 sm:h-20 bg-zinc-100 dark:bg-zinc-800
                                rounded-xl overflow-hidden flex-shrink-0">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" aria-hidden="true"
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-6 h-6 text-zinc-300" aria-hidden="true" />
                    </div>
                  )}
                </div>
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{v.title}</h2>
                  {v.description && (
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{v.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatusBadge status={v.status} />
                    {v.duration_sec && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {formatDuration(v.duration_sec)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
