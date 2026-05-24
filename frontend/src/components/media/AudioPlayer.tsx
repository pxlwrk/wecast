"use client";

/**
 * Accessible audio player component (WCAG 2.1 AA).
 * Supports keyboard navigation, transcript sync, and chapters.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, ChevronDown } from "lucide-react";
import { formatDuration } from "@/lib/auth";
import type { EpisodeDetail } from "@/types";
import TranscriptView from "./TranscriptView";

interface AudioPlayerProps {
  episode: EpisodeDetail;
}

export default function AudioPlayer({ episode }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }, [playing]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  }, [muted]);

  const skip = useCallback((secs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + secs, duration));
  }, [duration]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowLeft" || e.key === "j") skip(-10);
      if (e.key === "ArrowRight" || e.key === "l") skip(10);
      if (e.key === "m") toggleMute();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, skip]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section aria-label={`Audio-Player: ${episode.title}`} className="bg-white border border-gray-200 rounded-xl p-6">
      {/* Hidden native audio */}
      {episode.audio_url && (
        <audio
          ref={audioRef}
          src={episode.audio_url}
          preload="metadata"
          aria-hidden="true"
        />
      )}

      {/* Episode info */}
      <div className="mb-4">
        <h2 className="font-semibold text-gray-900">{episode.title}</h2>
        {episode.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{episode.description}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <input
          ref={progressRef}
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          step="0.5"
          aria-label="Wiedergabeposition"
          aria-valuetext={`${formatDuration(Math.round(currentTime))} von ${formatDuration(Math.round(duration))}`}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          className="w-full h-2 appearance-none bg-gray-200 rounded-full cursor-pointer accent-brand-600"
        />
        <div className="flex justify-between mt-1 text-xs text-gray-400" aria-hidden="true">
          <span>{formatDuration(Math.round(currentTime))}</span>
          <span>{formatDuration(Math.round(duration))}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3" role="group" aria-label="Wiedergabe-Steuerung">
          <button
            onClick={() => skip(-10)}
            aria-label="10 Sekunden zurückspulen"
            className="player-control p-2 text-gray-600 hover:text-gray-900 rounded transition-colors"
          >
            <SkipBack className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Wiedergabe starten"}
            aria-pressed={playing}
            className="player-control p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full transition-colors"
          >
            {playing ? (
              <Pause className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Play className="w-5 h-5" aria-hidden="true" />
            )}
          </button>

          <button
            onClick={() => skip(10)}
            aria-label="10 Sekunden vorspulen"
            className="player-control p-2 text-gray-600 hover:text-gray-900 rounded transition-colors"
          >
            <SkipForward className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2" role="group" aria-label="Lautstärke">
          <button
            onClick={toggleMute}
            aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}
            aria-pressed={muted}
            className="player-control p-2 text-gray-600 hover:text-gray-900 rounded transition-colors"
          >
            {muted ? (
              <VolumeX className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Volume2 className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            aria-label="Lautstärke"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
              if (v > 0) setMuted(false);
            }}
            className="w-20 h-2 appearance-none bg-gray-200 rounded-full cursor-pointer accent-brand-600"
          />
        </div>
      </div>

      {/* Chapters */}
      {episode.chapters_json && episode.chapters_json.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Kapitel</h3>
          <ol className="space-y-1" aria-label="Kapitelmarken">
            {episode.chapters_json.map((ch, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    if (audioRef.current) audioRef.current.currentTime = ch.start_sec;
                  }}
                  className="player-control text-left w-full text-sm text-brand-600 hover:text-brand-800 hover:underline"
                  aria-label={`${ch.title} bei ${formatDuration(ch.start_sec)}`}
                >
                  <span className="text-gray-400 mr-2 tabular-nums">
                    {formatDuration(Math.round(ch.start_sec))}
                  </span>
                  {ch.title}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Transcript toggle */}
      {episode.transcript_json && (
        <div className="mt-4">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            aria-expanded={showTranscript}
            aria-controls="transcript-panel"
            className="player-control flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showTranscript ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            Transkript {showTranscript ? "ausblenden" : "anzeigen"}
          </button>

          {showTranscript && (
            <TranscriptView
              id="transcript-panel"
              segments={episode.transcript_json.segments}
              currentTime={currentTime}
              onSeek={(t) => {
                if (audioRef.current) audioRef.current.currentTime = t;
              }}
            />
          )}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <p className="mt-4 text-xs text-gray-400" aria-label="Tastaturkürzel">
        Tastatur: <kbd className="px-1 bg-gray-100 rounded text-xs">Leertaste</kbd> Play/Pause ·
        <kbd className="px-1 bg-gray-100 rounded text-xs">← →</kbd> ±10s ·
        <kbd className="px-1 bg-gray-100 rounded text-xs">M</kbd> Stummschalten
      </p>
    </section>
  );
}
