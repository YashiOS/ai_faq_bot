"use client";

import { useEffect, useState } from "react";

import { ChatContainer } from "@/components/chat/ChatContainer";
import { cn } from "@/lib/format";
import { useSession } from "@/state/SessionProvider";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

/** Step 3: sidebar (drawer on mobile) + header + chat. */
export function ChatLayout() {
  const { state, reset } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const document = state.document;
  if (!document) return null;

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-72 shrink-0 border-r border-line bg-surface-muted/50 lg:block">
        <Sidebar document={document} onUploadAnother={reset} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn("fixed inset-0 z-40 lg:hidden", !drawerOpen && "pointer-events-none")}
        inert={!drawerOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            drawerOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Document menu"
          className={cn(
            "absolute inset-y-0 left-0 w-[85%] max-w-xs border-r border-line bg-bg shadow-xl transition-transform duration-200 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar
            document={document}
            onUploadAnother={reset}
            onClose={() => setDrawerOpen(false)}
          />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          filename={document.filename}
          onOpenMenu={() => setDrawerOpen(true)}
          onUploadAnother={reset}
        />
        <ChatContainer />
      </div>
    </div>
  );
}
