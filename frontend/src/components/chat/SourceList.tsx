import { FileText } from "lucide-react";
import type { Source } from "@/api/types";

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="mb-2 text-xs font-medium text-subtle">
        Sources <span className="tabular-nums">· {sources.length}</span>
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {sources.map((source, index) => (
          <li
            key={`${source.document}-${source.page}-${index}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted"
            title={`${source.document}, page ${source.page}`}
          >
            <FileText className="size-3.5 shrink-0 text-subtle" aria-hidden />
            <span className="truncate">{source.document}</span>
            <span className="shrink-0 text-subtle">·</span>
            <span className="shrink-0 font-medium text-ink tabular-nums">Page {source.page}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
