import { cn } from "@/lib/format";

export function StatusBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      Ready
    </span>
  );
}
