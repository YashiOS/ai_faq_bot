/**
 * Single source of truth for the backend location and routes.
 * If the FastAPI contract changes, update the paths here.
 */

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

export const ENDPOINTS = {
  health: "/health",
  upload: "/documents/upload",
  documentStatus: (documentId: string) =>
    `/documents/${encodeURIComponent(documentId)}`,
  chat: "/chat",
} as const;

/** Client-side limits; keep in sync with the backend. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const TIMEOUTS = {
  health: 5_000,
  status: 15_000,
  /** Local LLMs can be slow on first token; be generous. */
  chat: 180_000,
} as const;

/** How often to poll document status while it is processing. */
export const STATUS_POLL_INTERVAL_MS = 800;
