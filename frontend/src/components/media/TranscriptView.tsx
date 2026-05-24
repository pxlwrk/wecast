"use client";

import { useEffect, useRef } from "react";

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface TranscriptViewProps {
  id: string;
  segments: Segment[];
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function TranscriptView({ id, segments, currentTime, onSeek }: TranscriptViewProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.start && currentTime < s.end
  );

  // Scroll active segment into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIndex]);

  return (
    <div
      id={id}
      role="region"
      aria-label="Transkript"
      aria-live="polite"
      aria-relevant="text"
      className="mt-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-1"
    >
      {segments.map((seg, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSeek(seg.start)}
            aria-label={`Springe zu ${Math.round(seg.start)} Sekunden: ${seg.text}`}
            className={`w-full text-left text-sm px-2 py-1 rounded transition-colors
              ${isActive
                ? "bg-brand-100 text-brand-900 font-medium"
                : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            {seg.text}
          </button>
        );
      })}
    </div>
  );
}
