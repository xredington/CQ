"use client";

import { Button } from "@/components/ui/Button";

/** Baseline designed error state with retry for every member route. */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-line px-6 py-16 text-center">
      <span className="hex-marker mb-4 !h-4 !w-3.5 opacity-60" aria-hidden />
      <p className="font-display text-xl">This page didn&apos;t load</p>
      <p className="mt-1.5 max-w-sm text-sm text-ink/60">
        The data couldn&apos;t be fetched. Check your connection, then retry.
      </p>
      <Button onClick={reset} variant="secondary" className="mt-6">
        Retry
      </Button>
    </div>
  );
}
