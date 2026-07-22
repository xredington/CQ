import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="hex-marker mb-5 !h-5 !w-[1.125rem]" aria-hidden />
          <h1 className="font-display text-4xl tracking-tight">CodeHive</h1>
          <p className="mt-1 text-sm uppercase tracking-[0.2em] text-ink/50">
            Stacked by Redington
          </p>
          <p className="mt-6 text-sm leading-relaxed text-ink/70">
            The private community for AI leaders across the Middle East, Africa
            and India.
          </p>
        </div>
        {searchParams.reason === "paused" && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink/90"
          >
            Your CodeHive access has been paused. Contact the Redington team.
          </p>
        )}
        {searchParams.reason === "link-expired" && (
          <p
            role="alert"
            className="mb-6 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink/90"
          >
            That sign-in link has expired or was already used. Enter your email
            to get a fresh one.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  );
}
