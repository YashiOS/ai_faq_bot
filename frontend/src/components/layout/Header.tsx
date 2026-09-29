import { FileText, Menu, Plus } from "lucide-react";

import { Button } from "@/components/common/Button";
import { StatusBadge } from "./StatusBadge";

interface HeaderProps {
  filename: string;
  onOpenMenu: () => void;
  onUploadAnother: () => void;
}

export function Header({ filename, onOpenMenu, onUploadAnother }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg/90 px-3 backdrop-blur sm:px-5">
      <button
        type="button"
        onClick={onOpenMenu}
        className="-ml-1 rounded-md p-2 text-muted hover:bg-surface-muted hover:text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <FileText className="hidden size-4 shrink-0 text-subtle sm:block" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] leading-tight text-subtle lg:hidden">AI Document Assistant</p>
          <h1 className="truncate text-sm font-medium text-ink" title={filename}>
            {filename}
          </h1>
        </div>
        <StatusBadge className="ml-1 shrink-0 rounded-full border border-line bg-surface px-2 py-0.5" />
      </div>

      <Button size="sm" onClick={onUploadAnother} aria-label="Upload another document">
        <Plus className="size-4" aria-hidden />
        <span className="hidden sm:inline">New document</span>
      </Button>
    </header>
  );
}
