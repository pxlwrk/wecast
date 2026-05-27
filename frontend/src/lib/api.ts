/**
 * Typed API client for the WeCast backend.
 * Automatically attaches the access token and handles 401 refresh.
 */

const BASE = "/api/v1";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) { accessToken = token; }
export function getAccessToken() { return accessToken; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: "include" });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      const retry = await fetch(`${BASE}${path}`, { ...options, headers, credentials: "include" });
      if (!retry.ok) throw new ApiError(retry.status, await retry.text());
      return retry.json() as Promise<T>;
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) throw new ApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Upload a file via multipart/form-data (no JSON Content-Type override). */
async function upload<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData,
    credentials: "include",
  });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      const retry = await fetch(`${BASE}${path}`, { method, headers, body: formData, credentials: "include" });
      if (!retry.ok) throw new ApiError(retry.status, await retry.text());
      return retry.json() as Promise<T>;
    }
    throw new ApiError(401, "Unauthorized");
  }
  if (!res.ok) throw new ApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  const res = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" });
  if (!res.ok) { accessToken = null; return false; }
  const data = await res.json();
  accessToken = data.access_token;
  return true;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    login:  (username: string, password: string) =>
      request<{ access_token: string; expires_in: number }>("/auth/login", {
        method: "POST", body: JSON.stringify({ username, password }),
      }),
    logout: () => request<void>("/auth/logout", { method: "POST" }),
  },

  users: {
    me:      () => request<import("@/types").CurrentUser>("/users/me"),
    list:    () => request<import("@/types").CurrentUser[]>("/users/"),
    setRole: (id: number, role: string) =>
      request(`/users/${id}/role?role=${role}`, { method: "PATCH" }),
  },

  shows: {
    list:    () => request<import("@/types").Show[]>("/shows/"),
    get:     (slug: string) => request<import("@/types").ShowDetail>(`/shows/${slug}`),
    create:  (body: { title: string; slug: string; description?: string; is_public?: boolean }) =>
      request<import("@/types").ShowDetail>("/shows/", { method: "POST", body: JSON.stringify(body) }),
    update:  (slug: string, body: Partial<{ title: string; description: string; is_public: boolean }>) =>
      request<import("@/types").ShowDetail>(`/shows/${slug}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete:  (slug: string) => request<void>(`/shows/${slug}`, { method: "DELETE" }),
    episodes: (slug: string) => request<import("@/types").Episode[]>(`/shows/${slug}/episodes/`),
    uploadCover: (slug: string, file: File) => {
      const fd = new FormData();
      fd.append("cover", file);
      return upload<import("@/types").ShowDetail>(`/shows/${slug}/cover`, fd);
    },
    uploadEpisode: (slug: string, formData: FormData) =>
      upload<import("@/types").EpisodeDetail>(`/shows/${slug}/episodes/`, formData),
  },

  episodes: {
    get:         (id: number) => request<import("@/types").EpisodeDetail>(`/episodes/${id}`),
    update:      (id: number, body: Partial<{ title: string; description: string; status: string }>) =>
      request<import("@/types").EpisodeDetail>(`/episodes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete:      (id: number) => request<void>(`/episodes/${id}`, { method: "DELETE" }),
    uploadCover: (id: number, file: File) => {
      const fd = new FormData();
      fd.append("cover", file);
      return upload<import("@/types").EpisodeDetail>(`/episodes/${id}/cover`, fd);
    },
  },

  videos: {
    list:             () => request<import("@/types").Video[]>("/videos/"),
    get:              (id: number) => request<import("@/types").VideoDetail>(`/videos/${id}`),
    getUploadUrl:     (title: string, description?: string) =>
      request<{ upload_url: string; video_id: number; object_key: string; expires_in: number }>(
        `/videos/upload-url?title=${encodeURIComponent(title)}${description ? `&description=${encodeURIComponent(description)}` : ""}`,
        { method: "POST" }
      ),
    triggerProcessing: (id: number) => request(`/videos/${id}/process`, { method: "POST" }),
    update:           (id: number, body: Partial<{ title: string; description: string; status: string }>) =>
      request<import("@/types").VideoDetail>(`/videos/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete:           (id: number) => request<void>(`/videos/${id}`, { method: "DELETE" }),
  },

  recordings: {
    start:       (title: string, description?: string) =>
      request<import("@/types").VideoDetail>(
        `/recordings/start?title=${encodeURIComponent(title)}${description ? `&description=${encodeURIComponent(description)}` : ""}`,
        { method: "POST" }
      ),
    uploadChunk: (recordingId: number, chunk: Blob) =>
      fetch(`${BASE}/recordings/${recordingId}/chunk`, {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: chunk,
        credentials: "include",
      }),
    finish: (recordingId: number) =>
      request<import("@/types").VideoDetail>(`/recordings/${recordingId}/finish`, { method: "POST" }),
  },

  shorts: {
    list:   () => request<import("@/types").ShortUrl[]>("/shorts/"),
    create: (body: { target_type: string; target_id: number; vanity_slug?: string }) =>
      request<import("@/types").ShortUrl>("/shorts/", { method: "POST", body: JSON.stringify(body) }),
  },

  embed: {
    episode: (id: number) => request(`/embed/episode/${id}`),
    video:   (id: number) => request(`/embed/video/${id}`),
  },
};
