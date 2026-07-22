import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { HiveTreeExplorer, type TreeMember } from "./HiveTreeExplorer";
import type {
  CommunityEvent,
  Member,
  MemberRecruitCounts,
} from "@/lib/database.types";

export const metadata: Metadata = { title: "Hive tree" };
export const dynamic = "force-dynamic";

export default async function HiveTreePage() {
  const supabase = createClient();
  const [membersRes, countsRes, eventsRes] = await Promise.all([
    supabase
      .from("members")
      .select(
        "id, full_name, company, industry, country, avatar_url, referred_by, joined_event_id, status, role, created_at"
      )
      .order("created_at"),
    supabase
      .from("member_recruit_counts")
      .select("member_id, direct_recruits, total_downline"),
    supabase.from("events").select("id, name"),
  ]);

  if (membersRes.error) throw new Error(membersRes.error.message);

  const counts = new Map(
    ((countsRes.data ?? []) as MemberRecruitCounts[]).map((c) => [
      c.member_id,
      c,
    ])
  );
  const eventNames = new Map(
    ((eventsRes.data ?? []) as Pick<CommunityEvent, "id" | "name">[]).map(
      (e) => [e.id, e.name]
    )
  );

  const members: TreeMember[] = (
    (membersRes.data ?? []) as (Pick<
      Member,
      | "id"
      | "full_name"
      | "company"
      | "industry"
      | "country"
      | "avatar_url"
      | "referred_by"
      | "joined_event_id"
      | "status"
      | "role"
      | "created_at"
    >)[]
  ).map((m) => ({
    ...m,
    joined_event_name: m.joined_event_id
      ? eventNames.get(m.joined_event_id) ?? null
      : null,
    direct_recruits: counts.get(m.id)?.direct_recruits ?? 0,
    total_downline: counts.get(m.id)?.total_downline ?? 0,
  }));

  return <HiveTreeExplorer members={members} />;
}
