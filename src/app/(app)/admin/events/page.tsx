import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EventsAdmin } from "./EventsAdmin";
import type { CommunityEvent, Member } from "@/lib/database.types";

export const metadata: Metadata = { title: "Events · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const supabase = createClient();
  const [eventsRes, membersRes, attendanceRes] = await Promise.all([
    supabase.from("events").select("*").order("event_date", { ascending: false }),
    supabase
      .from("members")
      .select("id, full_name, company")
      .order("full_name"),
    supabase.from("event_attendance").select("event_id, member_id"),
  ]);

  if (eventsRes.error) throw new Error(eventsRes.error.message);

  return (
    <EventsAdmin
      events={(eventsRes.data ?? []) as CommunityEvent[]}
      members={
        (membersRes.data ?? []) as Pick<Member, "id" | "full_name" | "company">[]
      }
      attendance={
        (attendanceRes.data ?? []) as { event_id: string; member_id: string }[]
      }
    />
  );
}
