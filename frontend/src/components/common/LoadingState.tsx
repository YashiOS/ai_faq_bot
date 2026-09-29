import { Loader2 } from "lucide-react";
import { cn } from "@/lib/format";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

/** Three softly pulsing dots, used while waiting on the model. */
export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1.5 rounded-full bg-muted animate-pulse-dot"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

export function LoadingState({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn("flex items-center gap-2.5 text-sm text-muted", className)}
    >
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
