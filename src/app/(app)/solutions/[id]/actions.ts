"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";

const schema = z.object({
  solutionId: z.string().uuid(),
  note: z.string().trim().max(1000).optional(),
});

export async function sendInterest(input: unknown): Promise<{ error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { error: "You're signed out. Sign in and try again." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Something's off with that request. Reload and try again." };

  const supabase = createClient();
  const { error } = await supabase.from("solution_interests").insert({
    solution_id: parsed.data.solutionId,
    member_id: member.id,
    note: parsed.data.note || null,
  });

  // Unique constraint: an existing interest means the state already persists.
  if (error && error.code !== "23505") {
    return { error: "Your interest couldn't be recorded. Try again." };
  }
  revalidatePath(`/solutions/${parsed.data.solutionId}`);
  return {};
}
