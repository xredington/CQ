"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CONTACT_EMAIL } from "@/lib/constants";
import {
  sendSignInLink,
  signInWithPassword,
  type LoginState,
  type PasswordLoginState,
} from "./actions";

const magicInitial: LoginState = { status: "idle" };
const passwordInitial: PasswordLoginState = { status: "idle" };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      {label}
    </Button>
  );
}

function NotInvited() {
  return (
    <p
      role="alert"
      className="rounded-md border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink/80"
    >
      CodeHive is invite-only. This email isn&apos;t on the member list yet. If
      you attended a PodHive event, write to{" "}
      <a
        className="text-accent underline underline-offset-2"
        href={`mailto:${CONTACT_EMAIL}`}
      >
        {CONTACT_EMAIL}
      </a>{" "}
      and we&apos;ll get you set up.
    </p>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction] = useFormState(signInWithPassword, passwordInitial);
  const [magicState, magicAction] = useFormState(sendSignInLink, magicInitial);

  if (mode === "magic" && magicState.status === "sent") {
    return (
      <p
        role="status"
        className="rounded-md border border-line bg-surface px-4 py-4 text-sm leading-relaxed text-ink/90"
      >
        Check your inbox — your sign-in link is on its way to{" "}
        <strong className="text-ink">{magicState.email}</strong>. It expires in
        15 minutes.
      </p>
    );
  }

  if (mode === "password") {
    return (
      <form action={pwAction} className="space-y-4">
        <Input
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          error={
            pwState.status === "invalid"
              ? "Enter a valid email address."
              : undefined
          }
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <SubmitButton label="Sign in" />
        {pwState.status === "not-invited" && <NotInvited />}
        {pwState.status === "bad-credentials" && (
          <p role="alert" className="text-sm text-danger">
            That email and password don&apos;t match. Check them and try again.
          </p>
        )}
        {pwState.status === "error" && (
          <p role="alert" className="text-sm text-danger">
            You couldn&apos;t be signed in. Try again in a moment.
          </p>
        )}
        <button
          type="button"
          onClick={() => setMode("magic")}
          className="block w-full text-center text-sm text-ink/60 underline underline-offset-2 hover:text-ink"
        >
          Email me a sign-in link instead
        </button>
      </form>
    );
  }

  return (
    <form action={magicAction} className="space-y-4">
      <Input
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@company.com"
        error={
          magicState.status === "invalid"
            ? "Enter a valid email address."
            : undefined
        }
      />
      <SubmitButton label="Send sign-in link" />
      {magicState.status === "not-invited" && <NotInvited />}
      {magicState.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          The sign-in link couldn&apos;t be sent. Check the address and try
          again.
        </p>
      )}
      <button
        type="button"
        onClick={() => setMode("password")}
        className="block w-full text-center text-sm text-ink/60 underline underline-offset-2 hover:text-ink"
      >
        Use a password instead
      </button>
    </form>
  );
}
