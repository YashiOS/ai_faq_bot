import { Check, FileText, X } from "lucide-react";

import { Button } from "@/components/common/Button";
import { ErrorState } from "@/components/common/ErrorState";
import { Spinner } from "@/components/common/LoadingState";
import { cn, formatBytes } from "@/lib/format";
import { PROCESSING_STEPS, type StepId } from "@/state/session-reducer";

interface UploadProgressProps {
  file: File;
  step: StepId;
  uploadProgress: number | null;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onChooseAnother: () => void;
}

type StepState = "done" | "active" | "failed" | "pending";

export function UploadProgress({
  file,
  step,
  uploadProgress,
  error,
  onCancel,
  onRetry,
  onChooseAnother,
}: UploadProgressProps) {
  const currentIndex = PROCESSING_STEPS.findIndex((s) => s.id === step);
  const isReady = step === "ready";

  function stateOf(index: number): StepState {
    if (index < currentIndex || (isReady && index === currentIndex)) return "done";
    if (index === currentIndex) return error ? "failed" : "active";
    return "pending";
  }

  return (
    <div className="animate-fade-in space-y-5">
      <div className="rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger">
            <FileText className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-subtle">
              {error ? "Processing stopped" : isReady ? "Processed" : "Processing"}
            </p>
            <p className="truncate text-sm font-medium text-ink" title={file.name}>
              {file.name}
            </p>
          </div>
          <span className="hidden text-xs text-subtle sm:block">{formatBytes(file.size)}</span>
        </div>

        <ol className="space-y-0.5 px-5 py-4" aria-label="Processing steps">
          {PROCESSING_STEPS.map((s, index) => {
            const state = stateOf(index);
            const showPercent =
              s.id === "uploading" && state === "active" && uploadProgress !== null;
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 py-1.5"
                aria-current={state === "active" ? "step" : undefined}
              >
                <StepIcon state={state} />
                <span
                  className={cn(
                    "text-sm transition-colors",
                    state === "pending" && "text-subtle",
                    state === "active" && "font-medium text-ink",
                    state === "done" && "text-muted",
                    state === "failed" && "font-medium text-danger",
                  )}
                >
                  {s.label}
                </span>
                {showPercent && (
                  <span className="ml-auto text-xs tabular-nums text-subtle">
                    {Math.round(uploadProgress * 100)}%
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {error ? (
        <ErrorState
          title="We couldn't process this document"
          message={error}
          actions={
            <>
              <Button size="sm" variant="primary" onClick={onRetry}>
                Try again
              </Button>
              <Button size="sm" onClick={onChooseAnother}>
                Choose another file
              </Button>
            </>
          }
        />
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted" role="status" aria-live="polite">
            {isReady
              ? "Your document is ready."
              : "This can take a minute for larger documents. Please keep this tab open."}
          </p>
          {!isReady && (
            <Button size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const base = "flex size-5 shrink-0 items-center justify-center rounded-full";
  switch (state) {
    case "done":
      return (
        <span className={cn(base, "bg-accent text-accent-fg")}>
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      );
    case "active":
      return (
        <span className={cn(base, "text-accent")}>
          <Spinner className="size-[18px]" />
        </span>
      );
    case "failed":
      return (
        <span className={cn(base, "bg-danger text-white")}>
          <X className="size-3" strokeWidth={3} aria-hidden />
        </span>
      );
    default:
      return <span className={cn(base, "border-[1.5px] border-line-strong")} aria-hidden />;
  }
}
