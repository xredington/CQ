import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatEventDate } from "@/lib/dates";
import type { CommunityEvent, Member, MemberRecruitCounts } from "@/lib/database.types";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="font-mono text-2xl">{value}</p>
      <p className="mt-0.5 text-xs uppercase tracking-wider text-ink/50">
        {label}
      </p>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const supabase = createClient();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [membersRes, postsMonthRes, nextEventRes, interestsMonthRes, countsRes] =
    await Promise.all([
      supabase.from("members").select("id, status"),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("events")
        .select("*")
        .eq("status", "upcoming")
        .order("event_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("solution_interests")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("member_recruit_counts")
        .select("member_id, direct_recruits, total_downline")
        .order("total_downline", { ascending: false })
        .limit(5),
    ]);

  const members = (membersRes.data ?? []) as Pick<Member, "id" | "status">[];
  const nextEvent = nextEventRes.data as CommunityEvent | null;

  let nextEventRsvps = 0;
  if (nextEvent) {
    const { count } = await supabase
      .from("event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", nextEvent.id)
      .eq("status", "going");
    nextEventRsvps = count ?? 0;
  }

  const counts = (countsRes.data ?? []) as MemberRecruitCounts[];
  const recruiterIds = counts.filter((c) => c.total_downline > 0).map((c) => c.member_id);
  const { data: recruiterRows } = recruiterIds.length
    ? await supabase
        .from("members")
        .select("id, full_name, company, avatar_url")
        .in("id", recruiterIds)
    : { data: [] };
  const recruiterById = new Map(
    ((recruiterRows ?? []) as Pick<Member, "id" | "full_name" | "company" | "avatar_url">[]).map(
      (m) => [m.id, m]
    )
  );
  const topRecruiters = counts.filter((c) => c.total_downline > 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Members" value={members.length} />
        <Stat
          label="Active"
          value={members.filter((m) => m.status === "active").length}
          hint={`${members.filter((m) => m.status === "invited").length} invited, ${members.filter((m) => m.status === "deactivated").length} paused`}
        />
        <Stat label="Posts this month" value={postsMonthRes.count ?? 0} />
        <Stat
          label="RSVPs, next event"
          value={nextEventRsvps}
          hint={
            nextEvent
              ? `${nextEvent.name} · ${formatEventDate(nextEvent.event_date, nextEvent.timezone)}`
              : "No upcoming event"
          }
        />
        <Stat label="Interests this month" value={interestsMonthRes.count ?? 0} />
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 font-display text-xl">
          <span className="hex-marker" aria-hidden /> Top recruiters
        </h2>
        {topRecruiters.length === 0 ? (
          <EmptyState
            title="No recruits recorded yet"
            description="Referral chains appear here as members bring in peers."
          />
        ) : (
          <Card className="divide-y divide-line-soft">
            {topRecruiters.map((c, i) => {
              const m = recruiterById.get(c.member_id);
              if (!m) return null;
              return (
                <Link
                  key={c.member_id}
                  href={`/members/${c.member_id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-ink/[0.03]"
                >
                  <span className="w-5 font-mono text-sm text-ink/40">
                    {i + 1}
                  </span>
                  <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.full_name}</p>
                    <p className="truncate text-xs text-ink/50">{m.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {c.direct_recruits}
                      <span className="text-ink/40"> direct</span>
                    </p>
                    <p className="font-mono text-xs text-ink/50">
                      {c.total_downline} total downline
                    </p>
                  </div>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
