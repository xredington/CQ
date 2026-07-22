import type { ReactNode } from "react";

/** Designed empty state with a next action (brief §5 quality floor). */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line px-6 py-14 text-center">
      <span className="hex-marker mb-4 !h-4 !w-3.5 opacity-60" aria-hidden />
      <p className="font-display text-lg text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink/60">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
