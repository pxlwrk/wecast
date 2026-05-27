"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Visibility } from "@/types";
import VisibilityPicker from "@/components/ui/VisibilityPicker";
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Step = "form" | "uploading" | "processing" | "done" | "error";

export default function VideoUploadPage() {
  const router = useRouter();

  const [title,          setTitle]          = useState("");
  const [description,    setDescription]    = useState("");
  const [visibility,     setVisibility]     = useState<Visibility>("internal");
  const [allowedGroups,  setAllowedGroups]  = useState<string[]>([]);
  const [file,           setFile]           = useState<File | null>(null);
  const [step,           setStep]           = useState<Step>("form");
  const [progress,       setProgress]       = useState(0);
  const [errorMsg,       setErrorMsg]       = useState<string | null>(null);
  const [videoId,        setVideoId]        = useState<number | null>(null);
  const [dragOver,       setDragOver]       = useState(false);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    // Auto-fill title from filename if empty
    if (!title) {
      const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setTitle(name.charAt(0).toUpperCase() + name.slice(1));
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) handleFile(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !file) return;
    setErrorMsg(null);
    setStep("uploading");
    setProgress(0);

    try {
      // 1. Request presigned upload URL from backend
      const { upload_url, video_id, object_key } = await api.videos.getUploadUrl(
        title, description || undefined
      );
      setVideoId(video_id);

      // 2. Upload directly to MinIO via presigned URL (XHR for progress tracking)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100));
        };
        xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("Netzwerkfehler beim Hochladen"));
        xhr.open("PUT", upload_url);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      setProgress(100);

      // 3. Trigger processing + apply visibility settings
      await api.videos.triggerProcessing(video_id);
      await api.videos.update(video_id, { visibility, allowed_group_dns: allowedGroups });

      setStep("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Unbekannter Fehler");
      setStep("error");
    }
  }

  // ── Step: Done ───────────────────────────────────────────────────────────────
  if (step === "done" && videoId) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 animate-fade-up pt-12">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30
                        flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Upload erfolgreich!</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Das Video wird jetzt transkodiert und transkribiert. Das kann einige Minuten dauern.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link href={`/videos/${videoId}`} className="btn-primary">Video ansehen</Link>
          <Link href="/videos" className="btn-secondary">Zur Übersicht</Link>
        </div>
      </div>
    );
  }

  // ── Step: Error ──────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 animate-fade-up pt-12">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30
                        flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Upload fehlgeschlagen</h1>
          {errorMsg && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setStep("form")} className="btn-primary">Erneut versuchen</button>
          <Link href="/videos" className="btn-secondary">Abbrechen</Link>
        </div>
      </div>
    );
  }

  // ── Step: Uploading ──────────────────────────────────────────────────────────
  if (step === "uploading") {
    return (
      <div className="max-w-xl mx-auto text-center space-y-6 animate-fade-up pt-12">
        <div className="w-16 h-16 rounded-2xl bg-brand-100 dark:bg-brand-900/30
                        flex items-center justify-center mx-auto">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Video wird hochgeladen…</h1>
          <p className="mt-1 text-sm text-zinc-500">{file?.name}</p>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{progress} %</p>
      </div>
    );
  }

  // ── Step: Form ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      {/* Back */}
      <Link href="/videos" className="btn-ghost -ml-2 inline-flex">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Zurück zu Videos
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Video hochladen</h1>
        <p className="mt-0.5 text-sm text-zinc-500">MP4, MOV oder WebM – bis zu 5 GB</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div>
          <label className="label">Video-Datei <span className="text-red-500" aria-hidden="true">*</span></label>
          <div
            className={[
              "relative border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer",
              dragOver
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/10"
                : file
                ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
                : "border-zinc-300 dark:border-zinc-700 hover:border-brand-400 dark:hover:border-brand-600",
            ].join(" ")}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById("video-file-input")?.click()}
            role="button"
            tabIndex={0}
            aria-label="Video-Datei auswählen oder hierher ziehen"
            onKeyDown={(e) => e.key === "Enter" && document.getElementById("video-file-input")?.click()}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" aria-hidden="true" />
                <p className="font-medium text-emerald-700 dark:text-emerald-400">{file.name}</p>
                <p className="text-xs text-zinc-500">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB · {file.type || "video"}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-xs text-zinc-400 hover:text-red-500 transition-colors underline mt-1"
                >
                  Datei entfernen
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800
                                flex items-center justify-center">
                  <Upload className="w-6 h-6 text-zinc-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Datei hier ablegen oder klicken
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">MP4, MOV, WebM · max. 5 GB</p>
                </div>
              </div>
            )}
          </div>
          <input
            id="video-file-input"
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            aria-label="Video-Datei auswählen"
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="video-title" className="label">
            Titel <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="video-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={255}
            className="input"
            placeholder="Mein Video"
            aria-required="true"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="video-description" className="label">Beschreibung</label>
          <textarea
            id="video-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="textarea"
            placeholder="Worum geht es in diesem Video?"
          />
        </div>

        {/* Visibility */}
        <VisibilityPicker
          value={visibility}
          allowedGroups={allowedGroups}
          onChange={(v, g) => { setVisibility(v); setAllowedGroups(g); }}
        />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!title.trim() || !file}
            className="btn-primary"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Video hochladen
          </button>
          <Link href="/videos" className="btn-secondary">Abbrechen</Link>
        </div>
      </form>
    </div>
  );
}
