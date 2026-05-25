"use client";

/**
 * HLS Video Player with caption support (WCAG 2.1 AA).
 * Uses hls.js for adaptive bitrate streaming.
 * Captions are ON by default (accessibility requirement).
 */

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Play, Pause, Volume2, VolumeX, Maximize2, Captions } from "lucide-react";
import { formatDuration } from "@/lib/auth";

interface VideoPlayerProps {
  hlsUrl: string;
  subtitlesUrl?: string | null;
  title: string;
  thumbnail?: string | null;
}

export default function VideoPlayer({ hlsUrl, subtitlesUrl, title, thumbnail }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [captionsOn, setCaptionsOn] = useState(true); // ON by default
  const [showControls, setShowControls] = useState(true);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported() && hlsUrl) {
      const hls = new Hls({
        capLevelToPlayerSize: true,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl") && hlsUrl) {
      // Safari native HLS
      video.src = hlsUrl;
    }

    const onTime = () => setCurrentTime(video.currentTime);
    const onDuration = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);

    return () => {
      hlsRef.current?.destroy();
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [hlsUrl]);

  // Set caption track mode
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks.length) return;
    video.textTracks[0].mode = captionsOn ? "showing" : "hidden";
  }, [captionsOn]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }

  function showControlsBriefly() {
    setShowControls(true);
    if (hideTimeout.current !== null) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden"
      onMouseMove={showControlsBriefly}
      onFocus={showControlsBriefly}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        poster={thumbnail ?? undefined}
        playsInline
        crossOrigin="anonymous"
        aria-label={title}
      >
        {subtitlesUrl && (
          <track
            kind="captions"
            src={subtitlesUrl}
            srcLang="de"
            label="Deutsch"
            default
          />
        )}
        <p>
          Ihr Browser unterstützt kein HTML5 Video.{" "}
          <a href={hlsUrl} download>Video herunterladen</a>
        </p>
      </video>

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls || !playing ? "opacity-100" : "opacity-0"}`}
        role="group"
        aria-label="Video-Steuerung"
      >
        {/* Progress */}
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          step="0.5"
          aria-label="Wiedergabeposition"
          aria-valuetext={`${formatDuration(Math.round(currentTime))} von ${formatDuration(Math.round(duration))}`}
          onChange={(e) => {
            const t = parseFloat(e.target.value);
            if (videoRef.current) videoRef.current.currentTime = t;
            setCurrentTime(t);
          }}
          className="w-full h-1 mb-3 appearance-none bg-white/30 rounded-full cursor-pointer accent-brand-500"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                playing ? videoRef.current?.pause() : videoRef.current?.play();
              }}
              aria-label={playing ? "Pause" : "Wiedergabe starten"}
              aria-pressed={playing}
              className="player-control p-2 text-white hover:text-brand-300 rounded"
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            <button
              onClick={() => {
                const v = videoRef.current;
                if (v) { v.muted = !muted; setMuted(!muted); }
              }}
              aria-label={muted ? "Ton einschalten" : "Ton ausschalten"}
              aria-pressed={muted}
              className="player-control p-2 text-white hover:text-brand-300 rounded"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <span className="text-white text-xs tabular-nums" aria-live="off">
              {formatDuration(Math.round(currentTime))} / {formatDuration(Math.round(duration))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {subtitlesUrl && (
              <button
                onClick={() => setCaptionsOn(!captionsOn)}
                aria-label={captionsOn ? "Untertitel ausblenden" : "Untertitel einblenden"}
                aria-pressed={captionsOn}
                className={`player-control p-2 rounded ${captionsOn ? "text-brand-400" : "text-white/60"}`}
              >
                <Captions className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              aria-label="Vollbild umschalten"
              className="player-control p-2 text-white hover:text-brand-300 rounded"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
