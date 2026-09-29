import { FileText, Plus, X } from "lucide-react";

import { Button } from "@/components/common/Button";
import { Logo } from "@/components/common/Logo";
import { formatBytes } from "@/lib/format";
import type { ActiveDocument } from "@/state/session-reducer";
import { StatusBadge } from "./StatusBadge";

interface SidebarProps {
  document: ActiveDocument;
  onUploadAnother: () => void;
  /** Present when rendered inside the mobile drawer. */
  onClose?: () => void;
}

export function Sidebar({ document, onUploadAnother, onClose }: SidebarProps) {
  const details = [
    { label: "Size", value: formatBytes(document.sizeBytes) },
    document.pages != null && { label: "Pages", value: document.pages },
    document.chunks != null && { label: "Chunks indexed", value: document.chunks },
  ].filter(Boolean) as { label: string; value: string | number }[];

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between px-4">
        <Logo />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-ink"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-4">
        <p className="px-1 pb-2 text-xs font-medium text-subtle">Document</p>

        <div className="rounded-xl border border-line bg-surface p-3">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-danger-soft text-danger">
              <FileText className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink" title={document.filename}>
                {document.filename}
              </p>
              <StatusBadge className="mt-1" />
            </div>
          </div>

          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
            {details.map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-2">
                <dt className="text-subtle">{label}</dt>
                <dd className="font-medium text-muted tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Button className="mt-3 w-full" onClick={onUploadAnother}>
          <Plus className="size-4" aria-hidden />
          Upload another document
        </Button>
      </div>

      <p className="px-4 py-4 text-xs leading-relaxed text-subtle">
        Answers are generated from this document by your local backend.
      </p>
    </div>
  );
}
