"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name.").max(120),
  designation: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(400, "Keep your bio under 400 characters.").optional(),
  avatar_url: z.string().url().optional(),
});

export async function updateProfile(input: unknown): Promise<{ error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { error: "You're signed out. Sign in and try again." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("members")
    .update({
      full_name: parsed.data.full_name,
      designation: parsed.data.designation || null,
      bio: parsed.data.bio || null,
      ...(parsed.data.avatar_url ? { avatar_url: parsed.data.avatar_url } : {}),
    })
    .eq("id", member.id);

  if (error) return { error: "The changes couldn't be saved. Try again." };
  revalidatePath(`/members/${member.id}`);
  revalidatePath("/members");
  return {};
}
