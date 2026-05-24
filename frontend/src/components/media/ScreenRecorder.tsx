"use client";

/**
 * Browser-based screen recorder (Loom-style).
 * Uses MediaRecorder API to capture screen + optional mic audio.
 * Uploads chunks to backend every 5 seconds.
 */

import { useCallback, useRef, useState } from "react";
import { Monitor, Mic, MicOff, Circle, Square, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

type RecordingState = "idle" | "recording" | "uploading" | "done" | "error";

export default function ScreenRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [title, setTitle] = useState("");
  const [withMic, setWithMic] = useState(true);
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkQueueRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const uploadingRef = useRef(false);

  async function processChunkQueue(id: number) {
    if (uploadingRef.current) return;
    uploadingRef.current = true;
    while (chunkQueueRef.current.length > 0) {
      const chunk = chunkQueueRef.current.shift()!;
      await api.recordings.uploadChunk(id, chunk);
    }
    uploadingRef.current = false;
  }

  const startRecording = useCallback(async () => {
    if (!title.trim()) {
      setError("Bitte geben Sie einen Titel für die Aufnahme ein.");
      return;
    }
    setError(null);

    try {
      // Capture screen
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      });

      let stream = screenStream;

      // Optionally add microphone
      if (withMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const ctx = new AudioContext();
          const dest = ctx.createMediaStreamDestination();
          if (screenStream.getAudioTracks().length > 0) {
            ctx.createMediaStreamSource(screenStream).connect(dest);
          }
          ctx.createMediaStreamSource(micStream).connect(dest);
          stream = new MediaStream([
            ...screenStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
        } catch {
          // Microphone denied – continue without
        }
      }

      // Initialize recording session on server
      const rec = await api.recordings.start(title.trim());
      setRecordingId(rec.id);
      setState("recording");

      // Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunkQueueRef.current.push(e.data);
          processChunkQueue(rec.id);
        }
      };

      recorder.onstop = async () => {
        // Wait for remaining chunks to upload
        setState("uploading");
        await new Promise<void>((resolve) => {
          const wait = () => {
            if (chunkQueueRef.current.length === 0 && !uploadingRef.current) {
              resolve();
            } else {
              setTimeout(wait, 200);
            }
          };
          wait();
        });

        // Signal completion to server
        const video = await api.recordings.finish(rec.id);
        setVideoId(video.id);
        setState("done");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.onerror = () => {
        setState("error");
        setError("Aufnahme fehlgeschlagen. Bitte erneut versuchen.");
      };

      recorder.start(5000); // Chunk every 5 seconds
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Bildschirmfreigabe wurde verweigert.");
      } else {
        setError("Aufnahme konnte nicht gestartet werden.");
      }
      setState("idle");
    }
  }, [title, withMic]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  return (
    <section aria-label="Bildschirmaufnahme" className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bildschirm aufnehmen</h1>

      {state === "idle" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          {error && (
            <div role="alert" className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          <div>
            <label htmlFor="rec-title" className="block text-sm font-medium text-gray-700 mb-1">
              Titel der Aufnahme <span aria-hidden="true">*</span>
            </label>
            <input
              id="rec-title"
              type="text"
              required
              aria-required="true"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Sprint Review 2026-01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="rec-mic"
              type="checkbox"
              checked={withMic}
              onChange={(e) => setWithMic(e.target.checked)}
              className="w-4 h-4 accent-brand-600"
            />
            <label htmlFor="rec-mic" className="flex items-center gap-2 text-sm text-gray-700">
              {withMic ? <Mic className="w-4 h-4 text-brand-600" aria-hidden="true" /> : <MicOff className="w-4 h-4 text-gray-400" aria-hidden="true" />}
              Mikrofon aufnehmen
            </label>
          </div>

          <button
            onClick={startRecording}
            className="flex items-center gap-2 w-full justify-center py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Bildschirmaufnahme starten"
          >
            <Circle className="w-4 h-4" aria-hidden="true" />
            Aufnahme starten
          </button>

          <p className="text-xs text-gray-400 text-center">
            Sie werden aufgefordert, Ihren Bildschirm oder ein Fenster auszuwählen.
          </p>
        </div>
      )}

      {state === "recording" && (
        <div className="bg-white border-2 border-red-300 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
            <p className="font-semibold text-red-600" aria-live="assertive" aria-label="Aufnahme läuft">
              Aufnahme läuft…
            </p>
          </div>
          <p className="text-sm text-gray-500">
            <strong>„{title}"</strong> wird aufgenommen.
          </p>
          <Monitor className="w-16 h-16 text-gray-300 mx-auto" aria-hidden="true" />
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 w-full justify-center py-3 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-700 focus:ring-offset-2"
            aria-label="Aufnahme beenden"
          >
            <Square className="w-4 h-4" aria-hidden="true" />
            Aufnahme beenden
          </button>
        </div>
      )}

      {state === "uploading" && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center" aria-busy="true">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4" role="status">
            <span className="sr-only">Wird hochgeladen…</span>
          </div>
          <p className="text-gray-600">Aufnahme wird hochgeladen und verarbeitet…</p>
        </div>
      )}

      {state === "done" && (
        <div className="bg-white border border-green-200 rounded-xl p-6 text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" aria-hidden="true" />
          <p className="font-semibold text-gray-900" aria-live="polite">Aufnahme abgeschlossen!</p>
          <p className="text-sm text-gray-500">
            Die Verarbeitung und Transkription läuft im Hintergrund.
          </p>
          {videoId && (
            <a
              href={`/videos/${videoId}`}
              className="inline-block px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Aufnahme ansehen
            </a>
          )}
          <button
            onClick={() => { setState("idle"); setTitle(""); setRecordingId(null); setVideoId(null); }}
            className="block w-full text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Neue Aufnahme starten
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="bg-white border border-red-200 rounded-xl p-6 space-y-4" role="alert">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" aria-hidden="true" />
            <p className="font-semibold">Fehler bei der Aufnahme</p>
          </div>
          {error && <p className="text-sm text-gray-600">{error}</p>}
          <button
            onClick={() => { setState("idle"); setError(null); }}
            className="text-sm text-brand-600 hover:underline"
          >
            Erneut versuchen
          </button>
        </div>
      )}
    </section>
  );
}
