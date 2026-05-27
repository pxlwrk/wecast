// ── Auth ─────────────────────────────────────────────────────────────────────
export interface TokenPair {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  role: "admin" | "moderator" | "user";
  is_active: boolean;
  last_login: string | null;
}

// ── Shows & Episodes ──────────────────────────────────────────────────────────
export interface Show {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  episode_count: number;
  created_at: string;
}

export interface ShowDetail extends Show {
  owner_id: number | null;
  updated_at: string;
}

export interface Episode {
  id: number;
  show_id: number;
  title: string;
  slug: string;
  description: string | null;
  duration_sec: number | null;
  transcript_status: "pending" | "processing" | "done" | "error";
  status: "draft" | "processing" | "published" | "error";
  published_at: string | null;
  created_at: string;
  cover_image_url: string | null;
}

export interface EpisodeDetail extends Episode {
  audio_url: string | null;
  transcript_json: {
    language: string;
    segments: { start: number; end: number; text: string }[];
    text: string;
  } | null;
  summary: string | null;
  chapters_json: { title: string; start_sec: number }[] | null;
  updated_at: string;
  cover_image_url: string | null;
}

// ── Videos ────────────────────────────────────────────────────────────────────
export interface Video {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_sec: number | null;
  transcode_status: "pending" | "processing" | "done" | "error";
  transcript_status: "pending" | "processing" | "done" | "error";
  status: "draft" | "uploading" | "processing" | "published" | "error" | "recording";
  is_recording: boolean;
  published_at: string | null;
  created_at: string;
}

export interface VideoDetail extends Video {
  hls_url: string | null;
  subtitles_url: string | null;
  owner_id: number | null;
  updated_at: string;
}

// ── Short URLs ────────────────────────────────────────────────────────────────
export interface ShortUrl {
  id: number;
  code: string;
  vanity_slug: string | null;
  target_type: "episode" | "video";
  target_id: number;
  visit_count: number;
  short_url: string;
  created_at: string;
}
