import type { ReactNode } from "react";

/** Section header with the single-hex marker (brief §5 signature element). */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="hex-marker" aria-hidden />
          <h1 className="font-display text-3xl tracking-tight">{title}</h1>
        </div>
        {description && (
          <p className="mt-1.5 text-sm text-ink/60">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
