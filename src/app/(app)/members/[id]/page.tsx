import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { INDUSTRY_LABELS, POST_CATEGORY_LABELS } from "@/lib/constants";
import { formatMonthYear, relativeTime } from "@/lib/dates";
import { EditProfile } from "./EditProfile";
import type { Member, Post } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const viewer = await getCurrentMember();

  const [memberRes, hiveRes, postsRes] = await Promise.all([
    supabase.from("members").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("members")
      .select("id, full_name, designation, company, industry, country, avatar_url")
      .eq("referred_by", params.id)
      .order("created_at"),
    supabase
      .from("posts")
      .select("id, title, category, created_at")
      .eq("author_id", params.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const member = memberRes.data as Member | null;
  if (!member) notFound();

  const hive = (hiveRes.data ?? []) as Pick<
    Member,
    "id" | "full_name" | "designation" | "company" | "industry" | "country" | "avatar_url"
  >[];
  const posts = (postsRes.data ?? []) as Pick<
    Post,
    "id" | "title" | "category" | "created_at"
  >[];
  const isOwnProfile = viewer?.id === member.id;

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <Avatar name={member.full_name} src={member.avatar_url} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl tracking-tight">
            {member.full_name}
          </h1>
          <p className="mt-1 text-ink/70">
            {member.designation ? `${member.designation} · ` : ""}
            {member.company}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {member.industry && (
              <Badge>{INDUSTRY_LABELS[member.industry]}</Badge>
            )}
            {member.country && <Badge>{member.country}</Badge>}
            <Badge>Member since {formatMonthYear(member.created_at)}</Badge>
          </div>
          {member.bio && (
            <p className="mt-4 max-w-measure leading-relaxed text-ink/80">
              {member.bio}
            </p>
          )}
        </div>
        {isOwnProfile && (
          <EditProfile
            member={{
              full_name: member.full_name,
              designation: member.designation,
              bio: member.bio,
              avatar_url: member.avatar_url,
            }}
          />
        )}
      </div>

      <section>
        <h2 className="mb-1 flex items-center gap-2.5 font-display text-xl">
          <span className="hex-marker" aria-hidden /> Their Hive
          <span className="font-mono text-sm text-ink/50">{hive.length}</span>
        </h2>
        <p className="mb-4 text-sm text-ink/60">
          Leaders {member.full_name.split(" ")[0]} brought into the community.
        </p>
        {hive.length === 0 ? (
          <EmptyState
            title="No recruits yet"
            description={
              isOwnProfile
                ? "Invite a peer you rate through the Redington team and grow your Hive."
                : "This member hasn't grown their Hive yet."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hive.map((m) => (
              <Link key={m.id} href={`/members/${m.id}`} className="block">
                <Card className="flex items-center gap-3 p-4 transition-colors hover:border-accent/30">
                  <Avatar name={m.full_name} src={m.avatar_url} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{m.full_name}</p>
                    <p className="truncate text-xs text-ink/50">{m.company}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2.5 font-display text-xl">
          <span className="hex-marker" aria-hidden /> Recent posts
        </h2>
        {posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description={
              isOwnProfile
                ? "Share what you're building — start your first discussion."
                : "Nothing posted yet."
            }
          />
        ) : (
          <Card className="divide-y divide-line-soft">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/discussions/${post.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-ink/[0.03]"
              >
                <p className="min-w-0 flex-1 truncate text-sm">{post.title}</p>
                <Badge>{POST_CATEGORY_LABELS[post.category]}</Badge>
                <span className="text-xs text-ink/50">
                  {relativeTime(post.created_at)}
                </span>
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
