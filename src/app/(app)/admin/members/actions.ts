"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { INDUSTRIES } from "@/lib/constants";
import type { Industry } from "@/lib/database.types";

const memberFields = z.object({
  full_name: z.string().trim().min(2, "Enter a name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  company: z.string().trim().min(1, "Enter a company."),
  designation: z.string().trim().max(120).optional(),
  industry: z
    .enum(INDUSTRIES as [Industry, ...Industry[]])
    .optional()
    .or(z.literal("").transform(() => undefined)),
  country: z.string().trim().max(80).optional(),
  referred_by: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  joined_event_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  role: z.enum(["member", "admin"]).default("member"),
});

export async function addMember(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = memberFields.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("members").insert({
    ...parsed.data,
    designation: parsed.data.designation || null,
    industry: parsed.data.industry ?? null,
    country: parsed.data.country || null,
    referred_by: parsed.data.referred_by ?? null,
    joined_event_id: parsed.data.joined_event_id ?? null,
  });

  if (error) {
    if (error.code === "23505") return { error: "That email is already on the member list." };
    return { error: "The member couldn't be added. Try again." };
  }
  revalidatePath("/admin/members");
  revalidatePath("/members");
  return {};
}

const updateSchema = memberFields.extend({ id: z.string().uuid() });

export async function updateMember(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { id, ...fields } = parsed.data;
  if (fields.referred_by === id) return { error: "A member can't refer themselves." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({
      ...fields,
      designation: fields.designation || null,
      industry: fields.industry ?? null,
      country: fields.country || null,
      referred_by: fields.referred_by ?? null,
      joined_event_id: fields.joined_event_id ?? null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "That email is already on the member list." };
    return { error: "The changes couldn't be saved. Try again." };
  }
  revalidatePath("/admin/members");
  revalidatePath("/members");
  return {};
}

export async function setMemberStatus(
  memberId: string,
  status: "active" | "invited" | "deactivated"
): Promise<{ error?: string }> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(memberId).success) return { error: "Something's off with that request." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("members")
    .update({ status })
    .eq("id", memberId);
  if (error) return { error: "The status couldn't be changed. Try again." };
  revalidatePath("/admin/members");
  return {};
}

// ── CSV import ──────────────────────────────────────────────────────────────

export interface ImportRow {
  full_name: string;
  email: string;
  company: string;
  designation?: string;
  industry?: string;
  country?: string;
  referred_by_email?: string;
}

export interface ImportReport {
  added: number;
  skipped: { row: number; email: string; reason: string }[];
  error?: string;
}

const importRowSchema = z.object({
  full_name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  company: z.string().trim().min(1),
  designation: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  country: z.string().trim().optional(),
  referred_by_email: z.string().trim().toLowerCase().optional(),
});

/**
 * Imports the member CSV: validates every row (bad emails, duplicates,
 * unknown industry, unknown referrers), inserts in two passes so in-file
 * referral chains resolve regardless of row order, and returns a report.
 */
export async function importMembers(rows: ImportRow[]): Promise<ImportReport> {
  await requireAdmin();
  if (!Array.isArray(rows) || rows.length === 0) {
    return { added: 0, skipped: [], error: "The file has no data rows." };
  }
  if (rows.length > 1000) {
    return { added: 0, skipped: [], error: "That's over 1,000 rows — split the file and retry." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin.from("members").select("id, email");
  const existingByEmail = new Map(
    ((existing ?? []) as { id: string; email: string }[]).map((m) => [
      m.email.toLowerCase(),
      m.id,
    ])
  );

  const skipped: ImportReport["skipped"] = [];
  const valid: { row: number; data: z.infer<typeof importRowSchema> }[] = [];
  const seenInFile = new Set<string>();

  rows.forEach((raw, index) => {
    const rowNumber = index + 2; // 1-based + header row
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      skipped.push({
        row: rowNumber,
        email: raw.email ?? "",
        reason:
          field === "email"
            ? "bad email"
            : `missing ${String(field ?? "required field")}`,
      });
      return;
    }
    const data = parsed.data;
    if (data.industry && !INDUSTRIES.includes(data.industry as Industry)) {
      skipped.push({ row: rowNumber, email: data.email, reason: `unknown industry "${data.industry}"` });
      return;
    }
    if (existingByEmail.has(data.email)) {
      skipped.push({ row: rowNumber, email: data.email, reason: "duplicate email" });
      return;
    }
    if (seenInFile.has(data.email)) {
      skipped.push({ row: rowNumber, email: data.email, reason: "duplicate email in file" });
      return;
    }
    seenInFile.add(data.email);
    valid.push({ row: rowNumber, data });
  });

  // Referrers must exist either in the database or in this file.
  const importable = valid.filter(({ row, data }) => {
    if (!data.referred_by_email) return true;
    if (data.referred_by_email === data.email) {
      skipped.push({ row, email: data.email, reason: "refers to themselves" });
      return false;
    }
    if (
      existingByEmail.has(data.referred_by_email) ||
      seenInFile.has(data.referred_by_email)
    )
      return true;
    skipped.push({
      row,
      email: data.email,
      reason: `unknown referred_by "${data.referred_by_email}"`,
    });
    return false;
  });

  if (importable.length === 0) return { added: 0, skipped };

  // Pass 1: insert everyone without lineage.
  const { data: inserted, error: insertError } = await admin
    .from("members")
    .insert(
      importable.map(({ data }) => ({
        full_name: data.full_name,
        email: data.email,
        company: data.company,
        designation: data.designation || null,
        industry: (data.industry as Industry | undefined) ?? null,
        country: data.country || null,
      }))
    )
    .select("id, email");

  if (insertError || !inserted) {
    return { added: 0, skipped, error: "The import failed part-way. Nothing may have been saved — reload and check." };
  }

  const insertedByEmail = new Map(
    (inserted as { id: string; email: string }[]).map((m) => [
      m.email.toLowerCase(),
      m.id,
    ])
  );

  // Pass 2: wire referral lineage now that every referrer has an id.
  for (const { data } of importable) {
    if (!data.referred_by_email) continue;
    const referrerId =
      existingByEmail.get(data.referred_by_email) ??
      insertedByEmail.get(data.referred_by_email);
    const selfId = insertedByEmail.get(data.email);
    if (referrerId && selfId) {
      await admin
        .from("members")
        .update({ referred_by: referrerId })
        .eq("id", selfId);
    }
  }

  revalidatePath("/admin/members");
  revalidatePath("/admin/hive-tree");
  revalidatePath("/members");
  return { added: importable.length, skipped };
}
