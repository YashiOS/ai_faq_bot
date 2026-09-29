import { API_URL } from "./config";
import type { ApiErrorDetail } from "./types";

export type ApiErrorKind = "network" | "timeout" | "aborted" | "http";

/**
 * Error thrown by every API function. `message` is always safe to show
 * to users; technical details are logged to the console instead.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly kind: ApiErrorKind,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BACKEND_UNREACHABLE =
  "Can't reach the server. Make sure the backend is running and try again.";

/**
 * FastAPI returns `{ detail: ... }`. Structured details
 * (`{ code, message }`) are written for users; plain strings are
 * usually raw exception text and must not be shown.
 */
function readErrorDetail(body: unknown): ApiErrorDetail | null {
  if (!body || typeof body !== "object" || !("detail" in body)) return null;
  const detail = (body as { detail: unknown }).detail;
  if (
    detail &&
    typeof detail === "object" &&
    "code" in detail &&
    "message" in detail &&
    typeof detail.message === "string"
  ) {
    return { code: String(detail.code), message: detail.message };
  }
  return null;
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 404) return "The requested resource was not found.";
  if (status === 413) return "This file is too large to upload.";
  if (status === 422) return "The request was invalid. Please try again.";
  if (status === 503) return "The service is temporarily unavailable. Please try again shortly.";
  return fallback;
}

/** Build an ApiError from an HTTP response status + parsed body. */
export function errorFromResponse(
  status: number,
  body: unknown,
  fallback: string,
): ApiError {
  const detail = readErrorDetail(body);
  console.error(`[api] HTTP ${status}`, body);
  if (detail) return new ApiError(detail.message, "http", status, detail.code);
  return new ApiError(messageForStatus(status, fallback), "http", status);
}

export function networkError(cause: unknown): ApiError {
  console.error("[api] network error", cause);
  return new ApiError(BACKEND_UNREACHABLE, "network");
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  json?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** User-facing message for unexpected failures. */
  fallbackError: string;
}

/** JSON request helper used by all fetch-based API functions. */
export async function request<T>(
  path: string,
  { method = "GET", json, signal, timeoutMs, fallbackError }: RequestOptions,
): Promise<T> {
  const signals = [signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined]
    .filter((s): s is AbortSignal => Boolean(s));

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: json === undefined ? undefined : { "Content-Type": "application/json" },
      body: json === undefined ? undefined : JSON.stringify(json),
      signal: signals.length ? AbortSignal.any(signals) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw new ApiError("Request cancelled.", "aborted");
    if (error instanceof DOMException && error.name === "TimeoutError") {
      console.error("[api] timeout", path);
      throw new ApiError("The server took too long to respond. Please try again.", "timeout");
    }
    throw networkError(error);
  }

  const body = await parseBody(response);
  if (!response.ok) throw errorFromResponse(response.status, body, fallbackError);
  return body as T;
}
