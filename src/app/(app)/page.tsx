import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { greeting, formatEventDate, relativeTime } from "@/lib/dates";
import { POST_CATEGORY_LABELS } from "@/lib/constants";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  CommunityEvent,
  Post,
  PostCategory,
  RsvpStatus,
  Spotlight,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

interface ActivePost extends Post {
  author: { full_name: string; company: string } | null;
  replies: { created_at: string }[];
}

export default async function HomePage() {
  const member = await requireMember();
  const supabase = createClient();

  const [spotlightRes, postsRes, eventsRes, rsvpRes, statsRes] =
    await Promise.all([
      supabase
        .from("spotlights")
        .select("*, member:members(id, full_name, company, avatar_url)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("*, author:members(full_name, company), replies(created_at)"),
      supabase
        .from("events")
        .select("*")
        .eq("status", "upcoming")
        .order("event_date", { ascending: true })
        .limit(2),
      supabase.from("event_rsvps").select("event_id, status").eq("member_id", member.id),
      Promise.all([
        supabase.from("members").select("country", { count: "exact" }),
        supabase
          .from("solutions")
          .select("id", { count: "exact", head: true })
          .eq("status", "published"),
        supabase.from("posts").select("id", { count: "exact", head: true }),
      ]),
    ]);

  const spotlight = spotlightRes.data as
    | (Spotlight & {
        member: {
          id: string;
          full_name: string;
          company: string;
          avatar_url: string | null;
        } | null;
      })
    | null;

  const posts = ((postsRes.data ?? []) as ActivePost[])
    .map((p) => ({
      ...p,
      lastActive: p.replies.reduce(
        (latest, r) => (r.created_at > latest ? r.created_at : latest),
        p.created_at
      ),
    }))
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive))
    .slice(0, 5);

  const events = (eventsRes.data ?? []) as CommunityEvent[];
  const rsvps = new Map<string, RsvpStatus>(
    ((rsvpRes.data ?? []) as { event_id: string; status: RsvpStatus }[]).map(
      (r) => [r.event_id, r.status]
    )
  );

  const [membersCountRes, solutionsCountRes, postsCountRes] = statsRes;
  const memberRows = (membersCountRes.data ?? []) as { country: string | null }[];
  const stats = {
    members: membersCountRes.count ?? memberRows.length,
    countries: new Set(memberRows.map((m) => m.country).filter(Boolean)).size,
    solutions: solutionsCountRes.count ?? 0,
    discussions: postsCountRes.count ?? 0,
  };

  const firstName = member.full_name.split(" ")[0];

  return (
    <div className="space-y-10">
      <h1 className="font-display text-3xl tracking-tight">
        {greeting()}, {firstName}
      </h1>

      {/* 1 · Latest spotlight hero */}
      {spotlight && spotlight.member && (
        <Link href={`/spotlights/${spotlight.id}`} className="block">
          <Card className="group flex flex-col gap-6 p-6 transition-colors hover:border-accent/30 sm:p-8 md:flex-row md:items-center">
            <Avatar
              name={spotlight.member.full_name}
              src={spotlight.member.avatar_url}
              size="xl"
              className="hidden md:inline-flex"
            />
            <div className="min-w-0 flex-1">
              <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
                <span className="hex-marker" aria-hidden /> Member spotlight
              </p>
              <p className="font-display text-2xl leading-snug tracking-tight sm:text-3xl">
                {spotlight.headline}
              </p>
              <p className="mt-2 text-sm text-ink/60">
                {spotlight.member.full_name} · {spotlight.member.company}
              </p>
            </div>
            <div className="shrink-0 border-t border-line-soft pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
              <p className="text-xs uppercase tracking-wider text-ink/50">
                {spotlight.metric_label}
              </p>
              <p className="mt-1.5 font-mono text-2xl sm:text-3xl">
                <span className="text-ink/50 line-through decoration-danger/60">
                  {spotlight.metric_before}
                </span>{" "}
                <span aria-hidden>→</span>{" "}
                <span className="text-accent">{spotlight.metric_after}</span>
              </p>
            </div>
          </Card>
        </Link>
      )}

      {/* 2 · Active discussions */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 font-display text-xl">
            <span className="hex-marker" aria-hidden /> Active discussions
          </h2>
          <Link
            href="/discussions"
            className="flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
          >
            All discussions <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {posts.length === 0 ? (
          <EmptyState
            title="No discussions yet — start the first one"
            action={
              <Link href="/discussions/new">
                <Button>Start a discussion</Button>
              </Link>
            }
          />
        ) : (
          <Card className="divide-y divide-line-soft">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/discussions/${post.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.03]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {post.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink/50">
                    {post.author?.full_name} · {post.author?.company} ·{" "}
                    {relativeTime(post.lastActive)}
                  </p>
                </div>
                <Badge>
                  {POST_CATEGORY_LABELS[post.category as PostCategory]}
                </Badge>
                <span className="flex w-10 items-center gap-1 text-xs text-ink/50">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  {post.replies.length}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </section>

      {/* 3 · Upcoming PodHive events */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2.5 font-display text-xl">
            <span className="hex-marker" aria-hidden /> Upcoming PodHive events
          </h2>
          <Link
            href="/events"
            className="flex items-center gap-1 text-sm text-ink/60 hover:text-ink"
          >
            All events <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
        {events.length === 0 ? (
          <EmptyState
            title="No upcoming events"
            description="The next PodHive date lands here as soon as it's announced."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => {
              const rsvp = rsvps.get(event.id);
              return (
                <Link key={event.id} href="/events" className="block">
                  <Card className="p-5 transition-colors hover:border-accent/30">
                    <p className="font-display text-lg">{event.name}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      {event.city}, {event.country} ·{" "}
                      {formatEventDate(event.event_date, event.timezone)}
                    </p>
                    <div className="mt-3">
                      {rsvp === "going" ? (
                        <Badge tone="accent">You&apos;re going</Badge>
                      ) : rsvp === "not_going" ? (
                        <Badge>Can&apos;t make it</Badge>
                      ) : (
                        <Badge>RSVP open</Badge>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 4 · Stats strip */}
      <section
        aria-label="Community stats"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line-soft bg-line-soft sm:grid-cols-4"
      >
        {(
          [
            ["Members", stats.members],
            ["Countries", stats.countries],
            ["Solutions", stats.solutions],
            ["Discussions", stats.discussions],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="bg-surface px-5 py-4">
            <p className="font-mono text-2xl text-ink">{value}</p>
            <p className="mt-0.5 text-xs uppercase tracking-wider text-ink/50">
              {label}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
