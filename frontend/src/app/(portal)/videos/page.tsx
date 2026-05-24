"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Video } from "@/types";
import { Video as VideoIcon, Plus, Clock, AlertCircle } from "lucide-react";
import { formatDuration } from "@/lib/auth";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "badge-published",
    processing: "badge-processing",
    error: "badge-error",
    draft: "badge-draft",
    uploading: "badge-pending",
  };
  const labels: Record<string, string> = {
    published: "Veröffentlicht",
    processing: "Wird verarbeitet",
    error: "Fehler",
    draft: "Entwurf",
    uploading: "Wird hochgeladen",
  };
  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${map[status] ?? "badge-pending"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.videos.list().then(setVideos).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Videos</h1>
        <Link
          href="/videos/upload"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
          aria-label="Video hochladen"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Video hochladen
        </Link>
      </div>

      {loading ? (
        <p aria-live="polite" aria-busy="true" className="text-gray-500 text-sm">Wird geladen…</p>
      ) : videos.length === 0 ? (
        <div className="text-center py-16">
          <VideoIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <p className="text-gray-500">Keine Videos vorhanden.</p>
        </div>
      ) : (
        <ul className="space-y-3" role="list" aria-label="Videoliste">
          {videos.map((v) => (
            <li key={v.id}>
              <Link
                href={`/videos/${v.id}`}
                className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all"
              >
                {/* Thumbnail */}
                <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt="" aria-hidden="true" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoIcon className="w-8 h-8 text-gray-300" aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">{v.title}</h2>
                  {v.description && (
                    <p className="text-sm text-gray-500 truncate mt-0.5">{v.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <StatusBadge status={v.status} />
                    {v.duration_sec && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        {formatDuration(v.duration_sec)}
                      </span>
                    )}
                    {v.is_recording && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                        Aufnahme
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
