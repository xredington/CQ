"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const spotlightSchema = z.object({
  id: z.string().uuid().optional(),
  member_id: z.string().uuid({ message: "Pick a member." }),
  headline: z
    .string()
    .trim()
    .min(10, "Write a headline.")
    .max(120, "Keep the headline under 120 characters."),
  story_md: z.string().trim().min(50, "The story needs at least 50 characters."),
  metric_label: z.string().trim().min(2, "Name the metric."),
  metric_before: z.string().trim().min(1, "Enter the before value."),
  metric_after: z.string().trim().min(1, "Enter the after value."),
  hero_image_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["draft", "published"]),
});

export async function saveSpotlight(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = spotlightSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { id, ...fields } = parsed.data;
  const admin = createAdminClient();

  if (id) {
    const { data: existing } = await admin
      .from("spotlights")
      .select("status, published_at")
      .eq("id", id)
      .maybeSingle();
    const record = {
      ...fields,
      hero_image_url: fields.hero_image_url ?? null,
      published_at:
        fields.status === "published"
          ? ((existing?.published_at as string | null) ?? new Date().toISOString())
          : (existing?.published_at as string | null),
    };
    const { error } = await admin.from("spotlights").update(record).eq("id", id);
    if (error) return { error: "The spotlight couldn't be saved. Try again." };
  } else {
    const { error } = await admin.from("spotlights").insert({
      ...fields,
      hero_image_url: fields.hero_image_url ?? null,
      published_at: fields.status === "published" ? new Date().toISOString() : null,
    });
    if (error) return { error: "The spotlight couldn't be saved. Try again." };
  }

  revalidatePath("/admin/spotlights");
  revalidatePath("/spotlights");
  revalidatePath("/");
  return {};
}

export async function deleteSpotlight(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { error: "Something's off with that request." };
  const admin = createAdminClient();
  const { error } = await admin.from("spotlights").delete().eq("id", id);
  if (error) return { error: "The spotlight couldn't be deleted. Try again." };
  revalidatePath("/admin/spotlights");
  revalidatePath("/spotlights");
  return {};
}
