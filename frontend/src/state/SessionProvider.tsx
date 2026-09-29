"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import { askQuestion } from "@/api/chat";
import { ApiError } from "@/api/client";
import { uploadDocument, waitForDocumentReady } from "@/api/documents";
import {
  initialState,
  sessionReducer,
  stepForBackendStage,
  type ChatMessage,
  type SessionState,
} from "./session-reducer";

/** Pause on the all-done checklist before switching to chat. */
const READY_TRANSITION_MS = 700;

function friendlyMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  console.error(error);
  return fallback;
}

function isAbort(error: unknown): boolean {
  return error instanceof ApiError && error.kind === "aborted";
}

const newId = () => crypto.randomUUID();

interface SessionContextValue {
  state: SessionState;
  isAsking: boolean;
  selectFile: (file: File) => void;
  clearFile: () => void;
  processFile: () => Promise<void>;
  cancelProcessing: () => void;
  reset: () => void;
  ask: (question: string) => Promise<void>;
  retry: (assistantMessageId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const processingAbort = useRef<AbortController | null>(null);
  const chatAbort = useRef<AbortController | null>(null);

  // Abort any in-flight work on unmount.
  useEffect(
    () => () => {
      processingAbort.current?.abort();
      chatAbort.current?.abort();
    },
    [],
  );

  const selectFile = useCallback(
    (file: File) => dispatch({ type: "selectFile", file }),
    [],
  );
  const clearFile = useCallback(() => dispatch({ type: "clearFile" }), []);

  const processFile = useCallback(async () => {
    const file = state.file;
    if (!file) return;

    processingAbort.current?.abort();
    const controller = new AbortController();
    processingAbort.current = controller;
    const { signal } = controller;

    dispatch({ type: "processingStarted" });

    try {
      const uploaded = await uploadDocument(file, {
        signal,
        onUploadProgress: (fraction) =>
          dispatch({ type: "uploadProgress", fraction }),
      });
      dispatch({ type: "stepChanged", step: stepForBackendStage(uploaded.stage) });

      const ready = await waitForDocumentReady(uploaded, {
        signal,
        onUpdate: (doc) =>
          dispatch({ type: "stepChanged", step: stepForBackendStage(doc.stage) }),
      });
      dispatch({ type: "stepChanged", step: "ready" });

      await new Promise((r) => setTimeout(r, READY_TRANSITION_MS));
      if (signal.aborted) return;

      dispatch({
        type: "documentReady",
        document: {
          id: ready.document_id,
          collectionName: ready.collection_name,
          filename: ready.filename || file.name,
          sizeBytes: file.size,
          pages: ready.pages ?? null,
          chunks: ready.chunks ?? null,
        },
      });
    } catch (error) {
      if (isAbort(error) || signal.aborted) return;
      dispatch({
        type: "processingFailed",
        error: friendlyMessage(
          error,
          "Something went wrong while processing your document. Please try again.",
        ),
      });
    }
  }, [state.file]);

  const cancelProcessing = useCallback(() => {
    processingAbort.current?.abort();
    dispatch({ type: "processingCancelled" });
  }, []);

  const reset = useCallback(() => {
    processingAbort.current?.abort();
    chatAbort.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  const collectionName = state.document?.collectionName;

  const requestAnswer = useCallback(
    async (messageId: string, question: string) => {
      if (!collectionName) return;
      const controller = new AbortController();
      chatAbort.current = controller;

      try {
        const result = await askQuestion(
          { question, collection_name: collectionName },
          controller.signal,
        );
        dispatch({
          type: "answerReceived",
          messageId,
          content: result.answer,
          sources: result.sources,
        });
      } catch (error) {
        if (isAbort(error)) return;
        dispatch({
          type: "answerFailed",
          messageId,
          error: friendlyMessage(
            error,
            "Something went wrong while generating an answer. Please try again.",
          ),
        });
      }
    },
    [collectionName],
  );

  const isAsking = state.messages.some((m) => m.status === "pending");

  const ask = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || isAsking) return;

      const userMessage: ChatMessage = {
        id: newId(),
        role: "user",
        content: question,
        status: "done",
      };
      const assistantMessage: ChatMessage = {
        id: newId(),
        role: "assistant",
        content: "",
        status: "pending",
        question,
      };
      dispatch({ type: "questionAsked", userMessage, assistantMessage });
      await requestAnswer(assistantMessage.id, question);
    },
    [isAsking, requestAnswer],
  );

  const retry = useCallback(
    async (messageId: string) => {
      const message = state.messages.find((m) => m.id === messageId);
      if (!message?.question || isAsking) return;
      dispatch({ type: "answerRetried", messageId });
      await requestAnswer(messageId, message.question);
    },
    [state.messages, isAsking, requestAnswer],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      isAsking,
      selectFile,
      clearFile,
      processFile,
      cancelProcessing,
      reset,
      ask,
      retry,
    }),
    [state, isAsking, selectFile, clearFile, processFile, cancelProcessing, reset, ask, retry],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside <SessionProvider>");
  return context;
}
