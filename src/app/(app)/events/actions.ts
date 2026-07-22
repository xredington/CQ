"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";

const schema = z.object({
  eventId: z.string().uuid(),
  status: z.enum(["going", "not_going"]),
});

export async function rsvp(input: unknown): Promise<{ error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { error: "You're signed out. Sign in and try again." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Something's off with that request. Reload and try again." };

  const supabase = createClient();
  const { error } = await supabase
    .from("event_rsvps")
    .upsert(
      {
        event_id: parsed.data.eventId,
        member_id: member.id,
        status: parsed.data.status,
      },
      { onConflict: "event_id,member_id" }
    );

  if (error) return { error: "Your RSVP couldn't be saved. Try again." };
  revalidatePath("/events");
  revalidatePath("/");
  return {};
}
