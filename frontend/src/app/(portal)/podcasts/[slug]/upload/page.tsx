"use client";

import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, UploadCloud } from "lucide-react";
import { getAccessToken } from "@/lib/api";

export default function UploadEpisodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      if (description.trim()) formData.append("description", description.trim());
      formData.append("audio", file);

      const token = getAccessToken();
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
        xhr.onerror = () => reject(new Error("Netzwerkfehler beim Upload"));
        xhr.open("POST", `/api/v1/shows/${slug}/episodes`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
      });

      router.push(`/podcasts/${slug}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href={`/podcasts/${slug}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Zurück zur Sendung
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Episode hochladen</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div>
          <label htmlFor="ep-title" className="block text-sm font-medium text-gray-700 mb-1">Titel <span aria-hidden="true">*</span></label>
          <input
            id="ep-title" type="text" required aria-required="true"
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Folge 42 – KI im Unternehmen"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="ep-desc" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
          <textarea
            id="ep-desc" rows={2}
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
          />
        </div>

        <div>
          <label htmlFor="ep-file" className="block text-sm font-medium text-gray-700 mb-1">Audiodatei <span aria-hidden="true">*</span></label>
          <input
            id="ep-file" type="file" required aria-required="true"
            accept="audio/*,video/mp4"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="mt-1 text-xs text-gray-400">MP3, M4A, WAV, OGG oder MP4 (max. 500 MB)</p>
        </div>

        {uploading && (
          <div aria-live="polite">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Wird hochgeladen…</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="bg-brand-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={uploading || !file || !title.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            <UploadCloud className="w-4 h-4" aria-hidden="true" />
            {uploading ? `Hochladen… ${progress}%` : "Episode hochladen"}
          </button>
          <Link href={`/podcasts/${slug}`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
