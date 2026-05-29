"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Visibility } from "@/types";
import VisibilityPicker from "@/components/ui/VisibilityPicker";
import { ArrowLeft, Mic2, Upload, X } from "lucide-react";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

export default function NewShowPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title,         setTitle]         = useState("");
  const [slug,          setSlug]          = useState("");
  const [slugTouched,   setSlugTouched]   = useState(false);
  const [description,   setDescription]   = useState("");
  const [visibility,    setVisibility]    = useState<Visibility>("internal");
  const [allowedGroups, setAllowedGroups] = useState<string[]>([]);
  const [coverFile,     setCoverFile]     = useState<File | null>(null);
  const [coverPreview,  setCoverPreview]  = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!slugTouched) setSlug(slugify(val));
  }

  function handleCoverChange(file: File | null) {
    setCoverFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setCoverPreview(url);
    } else {
      setCoverPreview(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const show = await api.shows.create({
        title,
        slug,
        description: description || undefined,
        visibility,
        allowed_group_dns: visibility === "restricted" ? allowedGroups : [],
        is_public: visibility === "public",
      });

      if (coverFile) {
        await api.shows.uploadCover(show.slug, coverFile);
      }

      router.push(`/podcasts/${show.slug}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Dieser URL-Slug ist bereits vergeben. Bitte wählen Sie einen anderen.");
      } else {
        setError("Fehler beim Erstellen der Sendung. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <Link href="/podcasts" className="btn-ghost -ml-2">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Zurück zu Sendungen
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Neue Sendung erstellen</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Erstellen Sie eine neue Podcast-Sendung</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20
                                       border border-red-200 dark:border-red-800
                                       text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Cover image upload */}
        <div>
          <label className="label">Cover-Bild</label>
          <div
            className={[
              "relative aspect-square max-w-[200px] rounded-2xl overflow-hidden cursor-pointer",
              "border-2 border-dashed transition-colors",
              coverPreview
                ? "border-transparent"
                : "border-zinc-300 dark:border-zinc-700 hover:border-brand-400 dark:hover:border-brand-600",
            ].join(" ")}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            aria-label="Cover-Bild auswählen"
          >
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="Vorschau" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleCoverChange(null); }}
                  aria-label="Bild entfernen"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white
                             flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2
                              bg-zinc-50 dark:bg-zinc-900">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Mic2 className="w-5 h-5 text-zinc-400" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Bild auswählen</span>
                </div>
                <p className="text-xs text-zinc-400">JPG, PNG, WebP</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Cover-Bild Datei"
            onChange={(e) => handleCoverChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="label">Titel <span className="text-red-500" aria-hidden="true">*</span></label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            maxLength={255}
            className="input"
            placeholder="Mein Podcast"
            aria-required="true"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="label">
            URL-Slug <span className="text-red-500" aria-hidden="true">*</span>
            <span className="ml-1 font-normal text-zinc-500">(z. B. /podcasts/mein-podcast)</span>
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
            required
            pattern="^[a-z0-9-]+$"
            maxLength={255}
            className="input"
            placeholder="mein-podcast"
            aria-describedby="slug-hint"
            aria-required="true"
          />
          <p id="slug-hint" className="mt-1 text-xs text-zinc-500">
            Nur Kleinbuchstaben, Zahlen und Bindestriche.
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="label">Beschreibung</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="textarea"
            placeholder="Worum geht es in diesem Podcast?"
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
          <button type="submit" disabled={loading || !title.trim() || !slug.trim()} className="btn-primary">
            {loading ? (
              <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden="true" />
                Erstellen…</>
            ) : "Sendung erstellen"}
          </button>
          <Link href="/podcasts" className="btn-secondary">Abbrechen</Link>
        </div>
      </form>
    </div>
  );
}
