import type { ProcessingStage, Source } from "@/api/types";

/** Stages shown in the processing UI, in order. */
export const PROCESSING_STEPS = [
  { id: "uploading", label: "Uploading document" },
  { id: "extracting", label: "Extracting text" },
  { id: "chunking", label: "Creating document chunks" },
  { id: "embedding", label: "Generating embeddings" },
  { id: "indexing", label: "Indexing document" },
  { id: "ready", label: "Ready" },
] as const;

export type StepId = (typeof PROCESSING_STEPS)[number]["id"];

/** Map a backend stage onto the step that is currently in progress. */
export function stepForBackendStage(stage: ProcessingStage | undefined): StepId {
  switch (stage) {
    case "chunking":
    case "embedding":
    case "indexing":
    case "ready":
      return stage;
    // "uploaded" means the file arrived and extraction is next.
    default:
      return "extracting";
  }
}

export interface ActiveDocument {
  id: string;
  collectionName: string;
  filename: string;
  sizeBytes: number;
  pages: number | null;
  chunks: number | null;
}

export type MessageStatus = "pending" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: MessageStatus;
  sources?: Source[];
  /** For assistant messages: the question being answered (used for retry). */
  question?: string;
}

export type Phase = "select" | "processing" | "chat";

export interface SessionState {
  phase: Phase;
  file: File | null;
  step: StepId;
  /** Real upload progress 0–1 while uploading; null when unknown. */
  uploadProgress: number | null;
  processingError: string | null;
  document: ActiveDocument | null;
  messages: ChatMessage[];
}

export const initialState: SessionState = {
  phase: "select",
  file: null,
  step: "uploading",
  uploadProgress: null,
  processingError: null,
  document: null,
  messages: [],
};

export type SessionAction =
  | { type: "selectFile"; file: File }
  | { type: "clearFile" }
  | { type: "processingStarted" }
  | { type: "uploadProgress"; fraction: number }
  | { type: "stepChanged"; step: StepId }
  | { type: "processingFailed"; error: string }
  | { type: "processingCancelled" }
  | { type: "documentReady"; document: ActiveDocument }
  | { type: "reset" }
  | { type: "questionAsked"; userMessage: ChatMessage; assistantMessage: ChatMessage }
  | { type: "answerRetried"; messageId: string }
  | { type: "answerReceived"; messageId: string; content: string; sources: Source[] }
  | { type: "answerFailed"; messageId: string; error: string };

function updateMessage(
  messages: ChatMessage[],
  id: string,
  patch: Partial<ChatMessage>,
): ChatMessage[] {
  return messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case "selectFile":
      return { ...state, file: action.file, processingError: null };
    case "clearFile":
      return { ...state, file: null, processingError: null };
    case "processingStarted":
      return {
        ...state,
        phase: "processing",
        step: "uploading",
        uploadProgress: 0,
        processingError: null,
      };
    case "uploadProgress":
      return { ...state, uploadProgress: action.fraction };
    case "stepChanged":
      return { ...state, step: action.step, uploadProgress: null };
    case "processingFailed":
      return { ...state, processingError: action.error };
    case "processingCancelled":
      return { ...state, phase: "select", processingError: null };
    case "documentReady":
      return {
        ...state,
        phase: "chat",
        document: action.document,
        messages: [],
      };
    case "reset":
      return initialState;
    case "questionAsked":
      return {
        ...state,
        messages: [...state.messages, action.userMessage, action.assistantMessage],
      };
    case "answerRetried":
      return {
        ...state,
        messages: updateMessage(state.messages, action.messageId, {
          status: "pending",
          content: "",
        }),
      };
    case "answerReceived":
      return {
        ...state,
        messages: updateMessage(state.messages, action.messageId, {
          status: "done",
          content: action.content,
          sources: action.sources,
        }),
      };
    case "answerFailed":
      return {
        ...state,
        messages: updateMessage(state.messages, action.messageId, {
          status: "error",
          content: action.error,
        }),
      };
  }
}
