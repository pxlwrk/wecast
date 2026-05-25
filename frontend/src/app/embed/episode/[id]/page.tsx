/**
 * Standalone embed page for podcast episodes.
 */

import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

async function getEmbedMeta(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/embed/episode/${id}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = await getEmbedMeta(id);
  return { title: meta?.title ?? "Podcast-Episode" };
}

export default async function EmbedEpisodePage({ params }: Props) {
  const { id } = await params;
  const meta = await getEmbedMeta(id);

  if (!meta) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center" role="alert">
        <p className="text-white text-sm">Episode nicht gefunden oder nicht verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <main className="p-6 text-white">
        <h1 className="font-bold text-lg mb-2">{meta.title}</h1>
        {meta.description && <p className="text-gray-300 text-sm mb-4">{meta.description}</p>}
        {meta.media_url && (
          <audio
            controls
            src={meta.media_url}
            className="w-full"
            aria-label={meta.title}
            style={{ colorScheme: "dark" }}
          >
            <p>
              Ihr Browser unterstützt kein HTML5 Audio.{" "}
              <a href={meta.media_url} download className="text-blue-400 underline">
                Audio herunterladen
              </a>
            </p>
          </audio>
        )}
      </main>
    </div>
  );
}
