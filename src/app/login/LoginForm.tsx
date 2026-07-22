"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CONTACT_EMAIL } from "@/lib/constants";
import { sendSignInLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" loading={pending} className="w-full">
      Send sign-in link
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(sendSignInLink, initialState);

  if (state.status === "sent") {
    return (
      <p
        role="status"
        className="rounded-md border border-line bg-surface px-4 py-4 text-sm leading-relaxed text-ink/90"
      >
        Check your inbox — your sign-in link is on its way to{" "}
        <strong className="text-ink">{state.email}</strong>. It expires in 15
        minutes.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Input
        label="Work email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@company.com"
        error={
          state.status === "invalid"
            ? "Enter a valid email address."
            : undefined
        }
      />
      <SubmitButton />
      {state.status === "not-invited" && (
        <p
          role="alert"
          className="rounded-md border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink/80"
        >
          CodeHive is invite-only. This email isn&apos;t on the member list
          yet. If you attended a PodHive event, write to{" "}
          <a
            className="text-accent underline underline-offset-2"
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>{" "}
          and we&apos;ll get you set up.
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          The sign-in link couldn&apos;t be sent. Check the address and try
          again.
        </p>
      )}
    </form>
  );
}
