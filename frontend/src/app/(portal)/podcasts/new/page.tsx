"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ChevronLeft } from "lucide-react";

export default function NewShowPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toSlug(text: string) {
    return text.toLowerCase().replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue").replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const show = await api.shows.create({ title: title.trim(), slug: slug.trim(), description: description.trim() || undefined, is_public: isPublic });
      router.push(`/podcasts/${show.slug}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("409") ? "Dieser URL-Slug ist bereits vergeben." : "Fehler beim Erstellen der Sendung.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/podcasts" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        Zurück zu Podcasts
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Neue Sendung erstellen</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Titel <span aria-hidden="true">*</span>
          </label>
          <input
            id="title" type="text" required aria-required="true"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (!slug) setSlug(toSlug(e.target.value)); }}
            placeholder="z.B. TechTalk Weekly"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL-Slug <span aria-hidden="true">*</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">/podcasts/</span>
            <input
              id="slug" type="text" required aria-required="true"
              value={slug}
              onChange={(e) => setSlug(toSlug(e.target.value))}
              placeholder="techtalk-weekly"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
          <textarea
            id="description" rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kurze Beschreibung der Sendung…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <input id="public" type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 accent-brand-600" />
          <label htmlFor="public" className="text-sm text-gray-700">Öffentlich (ohne Login abrufbar)</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={saving || !title.trim() || !slug.trim()}
            className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {saving ? "Wird erstellt…" : "Sendung erstellen"}
          </button>
          <Link href="/podcasts" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Abbrechen
          </Link>
        </div>
      </form>
    </div>
  );
}
