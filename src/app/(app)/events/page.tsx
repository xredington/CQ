import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { EventsTabs, type EventWithMeta } from "./EventsTabs";
import type { CommunityEvent, RsvpStatus } from "@/lib/database.types";

export const metadata: Metadata = { title: "Events" };
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const member = await requireMember();
  const supabase = createClient();

  const [eventsRes, rsvpsRes] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .neq("status", "cancelled")
      .order("event_date", { ascending: false }),
    supabase.from("event_rsvps").select("event_id, member_id, status"),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);

  const events = (eventsRes.data ?? []) as CommunityEvent[];
  const rsvps = (rsvpsRes.data ?? []) as {
    event_id: string;
    member_id: string;
    status: RsvpStatus;
  }[];

  // Attendee counts for past events come through a security-definer function
  // (the attendance table itself is admin-only).
  const past = events.filter((e) => e.status === "completed");
  const attendeeCounts = await Promise.all(
    past.map(async (e) => {
      const { data } = await supabase.rpc("event_attendee_count", {
        p_event_id: e.id,
      });
      return [e.id, (data as number | null) ?? 0] as const;
    })
  );
  const attendeeCountById = new Map(attendeeCounts);

  const withMeta: EventWithMeta[] = events.map((e) => ({
    ...e,
    goingCount: rsvps.filter(
      (r) => r.event_id === e.id && r.status === "going"
    ).length,
    myRsvp:
      rsvps.find((r) => r.event_id === e.id && r.member_id === member.id)
        ?.status ?? null,
    attendeeCount: attendeeCountById.get(e.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Events"
        description="PodHive — where the community meets in person."
      />
      <EventsTabs events={withMeta} />
    </div>
  );
}
