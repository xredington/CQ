"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const flagSchema = z.object({
  postId: z.string().uuid(),
  value: z.boolean(),
});

export async function setPinned(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return { error: "Something's off with that request." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("posts")
    .update({ is_pinned: parsed.data.value })
    .eq("id", parsed.data.postId);
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/admin/discussions");
  revalidatePath("/discussions");
  return {};
}

export async function setLocked(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = flagSchema.safeParse(input);
  if (!parsed.success) return { error: "Something's off with that request." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("posts")
    .update({ is_locked: parsed.data.value })
    .eq("id", parsed.data.postId);
  if (error) return { error: "That didn't save. Try again." };
  revalidatePath("/admin/discussions");
  revalidatePath("/discussions");
  return {};
}

export async function adminDeletePost(postId: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(postId).success) return { error: "Something's off with that request." };
  const admin = createAdminClient();
  const { error } = await admin.from("posts").delete().eq("id", postId);
  if (error) return { error: "The discussion couldn't be deleted. Try again." };
  revalidatePath("/admin/discussions");
  revalidatePath("/discussions");
  return {};
}
