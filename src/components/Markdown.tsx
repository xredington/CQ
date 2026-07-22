import { renderMarkdown } from "@/lib/markdown";

/** Rendered member/admin markdown with editorial typography. */
export function Markdown({
  source,
  className = "",
}: {
  source: string;
  className?: string;
}) {
  return (
    <div
      className={`prose-ch ${className}`}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
    />
  );
}
