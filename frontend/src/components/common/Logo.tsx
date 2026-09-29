import { BookOpenText } from "lucide-react";
import { cn } from "@/lib/format";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg bg-accent text-accent-fg",
        className,
      )}
      aria-hidden
    >
      <BookOpenText className="size-[55%]" strokeWidth={2} />
    </span>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="size-7" />
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        AI Document Assistant
      </span>
    </div>
  );
}
