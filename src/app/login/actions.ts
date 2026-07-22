"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface LoginState {
  status: "idle" | "sent" | "not-invited" | "invalid" | "error";
  email?: string;
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Allowlist-gated magic link (brief §6): the email is checked against the
 * members table BEFORE signInWithOtp — non-members never receive an email.
 */
export async function sendSignInLink(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "invalid" };
  const email = parsed.data.email;

  // Allowlist check runs with the service role: the caller is anonymous, and
  // membership must never be probeable through RLS-visible reads.
  const admin = createAdminClient();
  const { data: member, error } = await admin
    .from("members")
    .select("id, status")
    .ilike("email", email)
    .maybeSingle();

  if (error) return { status: "error", email };
  if (!member || member.status === "deactivated") {
    return { status: "not-invited", email };
  }

  const supabase = createClient();
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (otpError) return { status: "error", email };

  return { status: "sent", email };
}
