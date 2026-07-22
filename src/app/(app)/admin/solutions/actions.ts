"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const solutionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Enter a title."),
  vendor: z.string().trim().min(1, "Enter a vendor."),
  category: z.enum([
    "copilot",
    "productivity-ai",
    "security-ai",
    "data-analytics",
    "industry-solution",
    "infrastructure",
    "other",
  ]),
  summary: z
    .string()
    .trim()
    .min(10, "Write a card summary.")
    .max(160, "Keep the summary under 160 characters."),
  description: z.string().trim().optional(),
  outcomes: z.string().trim().optional(),
  logo_url: z.string().trim().url().optional().or(z.literal("").transform(() => undefined)),
  owner_name: z.string().trim().optional(),
  owner_email: z
    .string()
    .trim()
    .email("Enter a valid owner email.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["draft", "published"]),
});

export async function saveSolution(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = solutionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { id, ...fields } = parsed.data;
  const record = {
    ...fields,
    description: fields.description || null,
    outcomes: fields.outcomes || null,
    logo_url: fields.logo_url ?? null,
    owner_name: fields.owner_name || null,
    owner_email: fields.owner_email ?? null,
  };

  const admin = createAdminClient();
  const { error } = id
    ? await admin.from("solutions").update(record).eq("id", id)
    : await admin.from("solutions").insert(record);

  if (error) return { error: "The solution couldn't be saved. Try again." };
  revalidatePath("/admin/solutions");
  revalidatePath("/solutions");
  return {};
}

export async function deleteSolution(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { error: "Something's off with that request." };
  const admin = createAdminClient();
  const { error } = await admin.from("solutions").delete().eq("id", id);
  if (error) return { error: "The solution couldn't be deleted. Try again." };
  revalidatePath("/admin/solutions");
  revalidatePath("/solutions");
  return {};
}
