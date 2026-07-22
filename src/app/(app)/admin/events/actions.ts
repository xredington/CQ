"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3, "Enter an event name."),
  city: z.string().trim().min(1, "Enter a city."),
  country: z.string().trim().min(1, "Enter a country."),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  timezone: z.string().trim().min(3, "Enter an IANA timezone."),
  description: z.string().trim().optional(),
  cover_image_url: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["upcoming", "completed", "cancelled"]),
});

export async function saveEvent(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { id, ...fields } = parsed.data;
  const record = {
    ...fields,
    description: fields.description || null,
    cover_image_url: fields.cover_image_url ?? null,
  };

  const admin = createAdminClient();
  const { error } = id
    ? await admin.from("events").update(record).eq("id", id)
    : await admin.from("events").insert(record);

  if (error) return { error: "The event couldn't be saved. Try again." };
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return {};
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!z.string().uuid().safeParse(id).success) return { error: "Something's off with that request." };
  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) return { error: "The event couldn't be deleted. Try again." };
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return {};
}

const attendanceSchema = z.object({
  eventId: z.string().uuid(),
  memberId: z.string().uuid(),
  attended: z.boolean(),
});

export async function setAttendance(input: unknown): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = attendanceSchema.safeParse(input);
  if (!parsed.success) return { error: "Something's off with that request." };

  const admin = createAdminClient();
  if (parsed.data.attended) {
    const { error } = await admin
      .from("event_attendance")
      .upsert(
        { event_id: parsed.data.eventId, member_id: parsed.data.memberId },
        { onConflict: "event_id,member_id" }
      );
    if (error) return { error: "Attendance couldn't be saved. Try again." };
  } else {
    const { error } = await admin
      .from("event_attendance")
      .delete()
      .eq("event_id", parsed.data.eventId)
      .eq("member_id", parsed.data.memberId);
    if (error) return { error: "Attendance couldn't be saved. Try again." };
  }
  revalidatePath("/admin/events");
  revalidatePath("/events");
  return {};
}
