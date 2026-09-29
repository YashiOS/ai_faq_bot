import { AlertCircle, RotateCcw } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/common/Button";
import { TypingDots } from "@/components/common/LoadingState";
import { LogoMark } from "@/components/common/Logo";
import type { ChatMessage as Message } from "@/state/session-reducer";
import { Markdown } from "./Markdown";
import { SourceList } from "./SourceList";

interface ChatMessageProps {
  message: Message;
  onRetry: (id: string) => void;
  retryDisabled: boolean;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onRetry,
  retryDisabled,
}: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <div className="animate-fade-in flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-surface-muted px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words text-ink sm:max-w-[75%]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in flex gap-3 sm:gap-4">
      <LogoMark className="mt-0.5 size-7 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 pt-0.5">
        {message.status === "pending" && (
          <div role="status" className="flex h-7 items-center gap-3 text-sm text-muted">
            <TypingDots />
            <span>Searching the document…</span>
          </div>
        )}

        {message.status === "error" && (
          <div role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3">
            <p className="flex items-start gap-2 text-sm text-ink">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              {message.content}
            </p>
            <Button
              size="sm"
              className="mt-2.5 ml-6"
              onClick={() => onRetry(message.id)}
              disabled={retryDisabled}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Retry
            </Button>
          </div>
        )}

        {message.status === "done" && (
          <div className="text-[15px] leading-relaxed break-words text-ink/90">
            <Markdown>{message.content || "_No answer was returned._"}</Markdown>
            <SourceList sources={message.sources ?? []} />
          </div>
        )}
      </div>
    </div>
  );
});
