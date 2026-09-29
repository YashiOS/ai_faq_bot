import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/format";

interface ErrorStateProps {
  title: string;
  message: string;
  actions?: ReactNode;
  className?: string;
}

export function ErrorState({ title, message, actions, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "animate-fade-in rounded-xl border border-danger/25 bg-danger-soft p-4",
        className,
      )}
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 size-[18px] shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{message}</p>
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
