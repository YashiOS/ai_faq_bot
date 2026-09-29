"use client";

import { ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { Spinner } from "@/components/common/LoadingState";
import { cn } from "@/lib/format";

const MAX_HEIGHT_PX = 200;

interface ChatInputProps {
  onSend: (text: string) => void;
  isBusy: boolean;
}

export function ChatInput({ onSend, isBusy }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !isBusy;

  // Grow with content up to a max height.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, [value]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    onSend(value);
    setValue("");
    textareaRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a newline; ignore while composing (IME).
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={submit}
      className={cn(
        "flex items-end gap-2 rounded-3xl border border-line bg-surface p-2 pl-4 shadow-sm transition-colors",
        "focus-within:border-line-strong focus-within:shadow-md",
      )}
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask a question about your document
      </label>
      <textarea
        id="chat-input"
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask something about your document…"
        rows={1}
        autoFocus
        className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-ink outline-none placeholder:text-subtle"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label={isBusy ? "Waiting for answer" : "Send question"}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          canSend
            ? "bg-accent text-accent-fg hover:bg-accent-hover"
            : "bg-surface-muted text-subtle",
        )}
      >
        {isBusy ? <Spinner className="size-[18px]" /> : <ArrowUp className="size-[18px]" strokeWidth={2.25} />}
      </button>
    </form>
  );
}
