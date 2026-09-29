import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders model output. Raw HTML is not rendered (react-markdown's
 * default), so answers can't inject markup into the page.
 */
const components: Components = {
  h1: (props) => <h3 className="mt-5 mb-2 text-base font-semibold text-ink first:mt-0" {...props} />,
  h2: (props) => <h3 className="mt-5 mb-2 text-base font-semibold text-ink first:mt-0" {...props} />,
  h3: (props) => <h4 className="mt-4 mb-1.5 text-[15px] font-semibold text-ink first:mt-0" {...props} />,
  h4: (props) => <h5 className="mt-4 mb-1.5 text-sm font-semibold text-ink first:mt-0" {...props} />,
  p: (props) => <p className="my-3 first:mt-0 last:mb-0" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-subtle" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:text-subtle" {...props} />,
  li: (props) => <li className="pl-1" {...props} />,
  strong: (props) => <strong className="font-semibold text-ink" {...props} />,
  a: (props) => (
    <a
      className="font-medium text-accent underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote className="my-3 border-l-2 border-line-strong pl-4 text-muted" {...props} />
  ),
  hr: () => <hr className="my-5 border-line" />,
  pre: (props) => (
    <pre
      className="my-3 overflow-x-auto rounded-lg border border-line bg-surface-muted p-3.5 font-mono text-[13px] leading-relaxed [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[0.85em] text-ink"
      {...props}
    />
  ),
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b border-line bg-surface-muted px-3 py-2 font-medium text-ink" {...props} />
  ),
  td: (props) => <td className="border-b border-line px-3 py-2 align-top" {...props} />,
};

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  );
}
