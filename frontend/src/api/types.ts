/**
 * Backend contract (FastAPI). See README "Backend API contract".
 */

export type ProcessingStage =
  | "uploaded"
  | "extracting"
  | "chunking"
  | "embedding"
  | "indexing"
  | "ready";

export type DocumentStatus = "processing" | "ready" | "failed";

export interface ApiErrorDetail {
  code: string;
  message: string;
}

/** Returned by POST /documents/upload and GET /documents/{id}. */
export interface DocumentInfo {
  document_id: string;
  collection_name: string;
  filename: string;
  status: DocumentStatus;
  stage?: ProcessingStage;
  pages?: number | null;
  chunks?: number | null;
  error?: ApiErrorDetail | null;
}

export interface Source {
  document: string;
  page: number | string;
}

export interface ChatRequest {
  question: string;
  collection_name: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}
