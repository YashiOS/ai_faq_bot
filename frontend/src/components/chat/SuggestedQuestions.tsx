import { ArrowUpRight } from "lucide-react";

// Static for now; could later be generated from the document.
const SUGGESTIONS = [
  "What is this document about?",
  "Summarize the key points.",
  "What are the main policies?",
  "Are there any important dates or deadlines?",
];

export function SuggestedQuestions({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {SUGGESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="group flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm text-muted transition-colors hover:border-line-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span>{question}</span>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-subtle transition-colors group-hover:text-accent"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}
