/**
 * Standalone embed page for videos.
 * No navigation, no auth UI – accessible iframe player.
 * CSP: frame-ancestors allows *.company.com
 */

import type { Metadata } from "next";
import VideoPlayer from "@/components/media/VideoPlayer";

type Props = { params: Promise<{ id: string }> };

async function getEmbedMeta(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/embed/video/${id}`,
    { next: { revalidate: 300 } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const meta = await getEmbedMeta(id);
  return { title: meta?.title ?? "Video" };
}

export default async function EmbedVideoPage({ params }: Props) {
  const { id } = await params;
  const meta = await getEmbedMeta(id);

  if (!meta) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center" role="alert">
        <p className="text-white text-sm">Video nicht gefunden oder nicht verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <main>
        <VideoPlayer
          hlsUrl={meta.media_url}
          subtitlesUrl={meta.subtitles_url}
          title={meta.title}
          thumbnail={meta.thumbnail_url}
        />
        <div className="px-4 py-3 bg-gray-900">
          <h1 className="text-white font-semibold text-sm truncate">{meta.title}</h1>
          {meta.description && (
            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{meta.description}</p>
          )}
        </div>
      </main>
    </div>
  );
}
