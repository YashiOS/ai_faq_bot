"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { API_URL } from "@/api/config";
import { checkHealth } from "@/api/health";
import { LogoMark } from "@/components/common/Logo";
import { useSession } from "@/state/SessionProvider";
import { PdfUpload } from "./PdfUpload";
import { UploadProgress } from "./UploadProgress";

/** Steps 1 & 2: choose a PDF, then watch it process. */
export function UploadScreen() {
  const { state, selectFile, clearFile, processFile, cancelProcessing } = useSession();
  const backendUp = useBackendHealth();
  const isProcessing = state.phase === "processing" && state.file;

  return (
    <main className="flex min-h-full flex-col items-center px-4 py-12 sm:justify-center sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark className="size-10 rounded-xl" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
            AI Document Assistant
          </h1>
          <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-muted">
            {isProcessing
              ? "Preparing your document so you can ask questions about it."
              : "Upload a PDF to start asking questions about your document."}
          </p>
        </div>

        {backendUp === false && !isProcessing && (
          <div
            role="status"
            className="animate-fade-in mb-4 flex items-start gap-2.5 rounded-lg border border-line bg-surface-muted px-3.5 py-3 text-sm text-muted"
          >
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              The backend isn&apos;t responding at{" "}
              <code className="font-mono text-xs text-ink">{API_URL}</code>. Start the FastAPI
              server before uploading.
            </span>
          </div>
        )}

        {isProcessing ? (
          <UploadProgress
            file={state.file!}
            step={state.step}
            uploadProgress={state.uploadProgress}
            error={state.processingError}
            onCancel={cancelProcessing}
            onRetry={processFile}
            onChooseAnother={() => {
              cancelProcessing();
              clearFile();
            }}
          />
        ) : (
          <PdfUpload
            file={state.file}
            onSelect={selectFile}
            onClear={clearFile}
            onSubmit={processFile}
          />
        )}
      </div>
    </main>
  );
}

/** null = checking, true = reachable, false = unreachable. Re-checks every 10s while down. */
function useBackendHealth(): boolean | null {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;

    async function probe() {
      const ok = await checkHealth(controller.signal);
      if (controller.signal.aborted) return;
      setHealthy(ok);
      if (!ok) timer = setTimeout(probe, 10_000);
    }
    probe();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  return healthy;
}
