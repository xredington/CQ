import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <span className="hex-marker mb-4 !h-4 !w-3.5 opacity-60" aria-hidden />
      <h1 className="font-display text-3xl">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm text-ink/60">
        The link may be old, or the content was removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent/90"
      >
        Back to home
      </Link>
    </main>
  );
}
