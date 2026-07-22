import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MembersAdmin } from "./MembersAdmin";
import type { CommunityEvent, Member } from "@/lib/database.types";

export const metadata: Metadata = { title: "Members · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const supabase = createClient();
  const [membersRes, eventsRes] = await Promise.all([
    supabase.from("members").select("*").order("full_name"),
    supabase.from("events").select("id, name").order("event_date"),
  ]);

  if (membersRes.error) throw new Error(membersRes.error.message);

  return (
    <MembersAdmin
      members={(membersRes.data ?? []) as Member[]}
      events={(eventsRes.data ?? []) as Pick<CommunityEvent, "id" | "name">[]}
    />
  );
}
