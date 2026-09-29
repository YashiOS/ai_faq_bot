"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef } from "react";

import { useSession } from "@/state/SessionProvider";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { SuggestedQuestions } from "./SuggestedQuestions";

export function ChatContainer() {
  const { state, isAsking, ask, retry } = useSession();
  const { messages, document } = state;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view when messages are added or resolved.
  const lastMessage = messages.at(-1);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, lastMessage?.status]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          {messages.length === 0 ? (
            <EmptyState filename={document?.filename} onSelect={ask} />
          ) : (
            <div className="space-y-8" aria-live="polite">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRetry={retry}
                  retryDisabled={isAsking}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-bg px-4 pb-4 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput onSend={ask} isBusy={isAsking} />
          <p className="mt-2 text-center text-xs text-subtle">
            Answers come only from your document and may be imperfect. Check the cited pages.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  filename,
  onSelect,
}: {
  filename?: string;
  onSelect: (question: string) => void;
}) {
  return (
    <div className="animate-fade-in flex min-h-[50vh] flex-col justify-center py-6">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Indexed
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          Your document is ready.
        </h2>
        <p className="mt-1.5 text-[15px] text-muted">
          Ask me anything about{" "}
          {filename ? <span className="font-medium text-ink">{filename}</span> : "this document"}.
        </p>
      </div>
      <p className="mb-3 text-xs font-medium text-subtle">Try asking</p>
      <SuggestedQuestions onSelect={onSelect} />
    </div>
  );
}
