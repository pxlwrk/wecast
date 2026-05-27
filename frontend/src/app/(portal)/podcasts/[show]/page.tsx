"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { ShowDetail, Episode } from "@/types";
import {
  ArrowLeft, Clock, Globe, Lock, Mic2, Plus, Upload, Trash2,
  CheckCircle2, AlertCircle, Loader2, FileAudio, Edit3
} from "lucide-react";
import { formatDuration } from "@/lib/auth";

function EpisodeStatusIcon({ status }: { status: string }) {
  if (status === "published")  return <CheckCircle2 className="w-4 h-4 text-emerald-500" aria-hidden="true" />;
  if (status === "processing") return <Loader2      className="w-4 h-4 text-amber-500 animate-spin" aria-hidden="true" />;
  if (status === "error")      return <AlertCircle  className="w-4 h-4 text-red-500"    aria-hidden="true" />;
  return <FileAudio className="w-4 h-4 text-zinc-400" aria-hidden="true" />;
}

export default function ShowDetailPage() {
  const { show: slug } = useParams<{ show: string }>();
  const router = useRouter();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [show,     setShow]     = useState<ShowDetail | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Upload episode state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc,  setUploadDesc]  = useState("");
  const [audioFile,   setAudioFile]   = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // Cover upload
  const [coverUploading, setCoverUploading] = useState(false);

  async function load() {
    try {
      const [s, eps] = await Promise.all([
        api.shows.get(slug),
        api.shows.episodes(slug),
      ]);
      setShow(s);
      setEpisodes(eps);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [slug]);

  async function handleCoverUpload(file: File) {
    if (!show) return;
    setCoverUploading(true);
    try {
      const updated = await api.shows.uploadCover(show.slug, file);
      setShow(updated);
    } finally {
      setCoverUploading(false);
    }
  }

  async function handleEpisodeUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile || !uploadTitle.trim()) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("title",       uploadTitle);
      fd.append("description", uploadDesc);
      fd.append("audio",       audioFile);

      const ep = await api.shows.uploadEpisode(slug, fd);
      setEpisodes((prev) => [ep, ...prev]);
      setUploadTitle("");
      setUploadDesc("");
      setAudioFile(null);
      setShowUploadForm(false);
    } catch {
      setUploadError("Fehler beim Hochladen. Bitte versuchen Sie es erneut.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="skeleton h-6 w-32" />
        <div className="flex gap-6">
          <div className="skeleton w-40 h-40 flex-shrink-0 rounded-2xl" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-8 w-2/3" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !show) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-500">Sendung nicht gefunden.</p>
        <Link href="/podcasts" className="btn-primary mt-4">Zurück</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Back */}
      <Link href="/podcasts" className="btn-ghost -ml-2 inline-flex">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Alle Sendungen
      </Link>

      {/* Show header */}
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Cover */}
        <div className="relative group w-40 h-40 flex-shrink-0">
          <div className="w-40 h-40 rounded-2xl overflow-hidden bg-gradient-to-br
                          from-brand-100 to-violet-50 dark:from-brand-900/30 dark:to-violet-900/20">
            {show.cover_image_url ? (
              <img src={show.cover_image_url} alt={`Cover von ${show.title}`}
                   className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Mic2 className="w-16 h-16 text-brand-300 dark:text-brand-700" aria-hidden="true" />
              </div>
            )}
          </div>
          {/* Cover upload overlay */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            disabled={coverUploading}
            aria-label="Cover-Bild ändern"
            className="absolute inset-0 flex flex-col items-center justify-center gap-1.5
                       bg-black/0 group-hover:bg-black/40 rounded-2xl transition-colors
                       text-white opacity-0 group-hover:opacity-100"
          >
            {coverUploading
              ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
              : <><Upload className="w-6 h-6" aria-hidden="true" /><span className="text-xs font-medium">Ändern</span></>}
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="sr-only"
                 aria-label="Cover-Bild auswählen"
                 onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex-1">{show.title}</h1>
            <span aria-label={show.is_public ? "Öffentlich" : "Intern"}>
              {show.is_public
                ? <Globe className="w-4 h-4 text-zinc-400 mt-1" />
                : <Lock  className="w-4 h-4 text-zinc-400 mt-1" />}
            </span>
          </div>
          {show.description && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{show.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="badge-published">
              {episodes.length} {episodes.length === 1 ? "Episode" : "Episoden"}
            </span>
            {show.is_public && (
              <Link
                href={`/api/v1/shows/${show.slug}/rss`}
                target="_blank"
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
              >
                RSS-Feed ↗
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Episodes section */}
      <section aria-labelledby="episodes-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="episodes-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Episoden
          </h2>
          <button onClick={() => setShowUploadForm(!showUploadForm)} className="btn-primary">
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Episode hochladen</span>
            <span className="sm:hidden">Hochladen</span>
          </button>
        </div>

        {/* Upload form */}
        {showUploadForm && (
          <form onSubmit={handleEpisodeUpload}
            className="card p-5 mb-4 space-y-4 border-brand-200 dark:border-brand-800">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Neue Episode</h3>

            {uploadError && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20
                                           border border-red-200 dark:border-red-800
                                           text-sm text-red-700 dark:text-red-400">
                {uploadError}
              </div>
            )}

            <div>
              <label htmlFor="ep-title" className="label">Titel *</label>
              <input id="ep-title" type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)}
                required className="input" placeholder="Episodentitel" />
            </div>
            <div>
              <label htmlFor="ep-desc" className="label">Beschreibung</label>
              <textarea id="ep-desc" value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)}
                rows={2} className="textarea" placeholder="Kurze Beschreibung…" />
            </div>
            <div>
              <label className="label">Audiodatei *</label>
              <div
                onClick={() => audioInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700
                           hover:border-brand-400 dark:hover:border-brand-600
                           rounded-xl p-4 text-center cursor-pointer transition-colors"
                role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && audioInputRef.current?.click()}
                aria-label="Audiodatei auswählen"
              >
                {audioFile ? (
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{audioFile.name}</p>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <Upload className="w-6 h-6 text-zinc-400" aria-hidden="true" />
                    <p className="text-sm text-zinc-500">MP3, M4A, AAC auswählen</p>
                  </div>
                )}
              </div>
              <input ref={audioInputRef} type="file" accept="audio/*,video/mp4" className="sr-only"
                     aria-label="Audiodatei" onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={uploading || !uploadTitle.trim() || !audioFile}
                className="btn-primary">
                {uploading
                  ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />Hochladen…</>
                  : "Episode hochladen"}
              </button>
              <button type="button" onClick={() => setShowUploadForm(false)} className="btn-secondary">
                Abbrechen
              </button>
            </div>
          </form>
        )}

        {/* Episode list */}
        {episodes.length === 0 ? (
          <div className="text-center py-12 card">
            <Mic2 className="w-10 h-10 text-zinc-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-zinc-500">Noch keine Episoden.</p>
            <button onClick={() => setShowUploadForm(true)} className="btn-primary mt-4 mx-auto">
              <Plus className="w-4 h-4" aria-hidden="true" /> Episode hochladen
            </button>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {episodes.map((ep, idx) => (
              <li key={ep.id}>
                <div className="card p-4 flex items-center gap-4">
                  {/* Number */}
                  <span className="text-sm font-mono text-zinc-400 w-6 text-right flex-shrink-0"
                    aria-hidden="true">
                    {episodes.length - idx}
                  </span>
                  {/* Status icon */}
                  <EpisodeStatusIcon status={ep.status} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{ep.title}</p>
                    {ep.description && (
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{ep.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {ep.status === "processing" && (
                        <span className="badge-processing">
                          <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          Wird verarbeitet
                        </span>
                      )}
                      {ep.duration_sec && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {formatDuration(ep.duration_sec)}
                        </span>
                      )}
                      {ep.transcript_status === "done" && (
                        <span className="badge-done">Transkript</span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
