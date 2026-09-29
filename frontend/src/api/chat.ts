import { request } from "./client";
import { ENDPOINTS, TIMEOUTS } from "./config";
import type { ChatRequest, ChatResponse } from "./types";

/** POST /chat — ask a question about an indexed document. */
export async function askQuestion(
  payload: ChatRequest,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const response = await request<ChatResponse>(ENDPOINTS.chat, {
    method: "POST",
    json: payload,
    signal,
    timeoutMs: TIMEOUTS.chat,
    fallbackError:
      "Something went wrong while generating an answer. Please try again.",
  });

  return {
    answer: response?.answer ?? "",
    sources: Array.isArray(response?.sources) ? response.sources : [],
  };
}
