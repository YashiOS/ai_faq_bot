import {
  ApiError,
  errorFromResponse,
  networkError,
  request,
} from "./client";
import {
  API_URL,
  ENDPOINTS,
  STATUS_POLL_INTERVAL_MS,
  TIMEOUTS,
} from "./config";
import type { DocumentInfo } from "./types";

const UPLOAD_FAILED =
  "Something went wrong while uploading your document. Please try again.";
const PROCESSING_FAILED =
  "Something went wrong while processing your document. Please try again.";

interface UploadOptions {
  signal?: AbortSignal;
  /** Real upload progress (0–1) as reported by the browser. */
  onUploadProgress?: (fraction: number) => void;
}

/**
 * POST /documents/upload (multipart/form-data, field "file").
 * Uses XHR rather than fetch because fetch can't report upload progress.
 */
export function uploadDocument(
  file: File,
  { signal, onUploadProgress }: UploadOptions = {},
): Promise<DocumentInfo> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError("Upload cancelled.", "aborted"));
      return;
    }

    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    xhr.open("POST", `${API_URL}${ENDPOINTS.upload}`);
    xhr.responseType = "json";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onUploadProgress?.(event.loaded / event.total);
    };

    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response) {
        resolve(xhr.response as DocumentInfo);
      } else {
        reject(errorFromResponse(xhr.status, xhr.response, UPLOAD_FAILED));
      }
    };
    xhr.onerror = () => {
      cleanup();
      reject(networkError(`XHR error uploading ${file.name}`));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new ApiError("Upload cancelled.", "aborted"));
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

/** GET /documents/{id} — current processing status. */
export function getDocumentStatus(
  documentId: string,
  signal?: AbortSignal,
): Promise<DocumentInfo> {
  return request<DocumentInfo>(ENDPOINTS.documentStatus(documentId), {
    signal,
    timeoutMs: TIMEOUTS.status,
    fallbackError: PROCESSING_FAILED,
  });
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new ApiError("Cancelled.", "aborted"));
      },
      { once: true },
    );
  });
}

function throwIfFailed(doc: DocumentInfo) {
  if (doc.status === "failed") {
    console.error("[api] document processing failed", doc.error);
    throw new ApiError(
      doc.error?.message ?? PROCESSING_FAILED,
      "http",
      undefined,
      doc.error?.code,
    );
  }
}

const MAX_CONSECUTIVE_POLL_FAILURES = 3;

/**
 * Poll until the document is ready (resolves) or failed (rejects).
 * If the backend processes synchronously and the upload response is
 * already "ready", this resolves immediately without polling.
 */
export async function waitForDocumentReady(
  initial: DocumentInfo,
  {
    signal,
    onUpdate,
  }: { signal?: AbortSignal; onUpdate?: (doc: DocumentInfo) => void } = {},
): Promise<DocumentInfo> {
  let doc = initial;
  let failures = 0;

  while (true) {
    throwIfFailed(doc);
    if (doc.status === "ready") return doc;

    await delay(STATUS_POLL_INTERVAL_MS, signal);

    try {
      doc = await getDocumentStatus(initial.document_id, signal);
      failures = 0;
      onUpdate?.(doc);
    } catch (error) {
      // Tolerate brief network blips; give up on anything else.
      const transient =
        error instanceof ApiError &&
        (error.kind === "network" || error.kind === "timeout");
      if (!transient || ++failures >= MAX_CONSECUTIVE_POLL_FAILURES) throw error;
    }
  }
}
