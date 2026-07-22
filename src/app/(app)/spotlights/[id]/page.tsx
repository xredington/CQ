import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/Markdown";
import { formatDate } from "@/lib/dates";
import type { Spotlight } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type SpotlightDetail = Spotlight & {
  member: {
    id: string;
    full_name: string;
    company: string;
    designation: string | null;
    avatar_url: string | null;
  } | null;
};

export default async function SpotlightDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("spotlights")
    .select(
      "*, member:members(id, full_name, company, designation, avatar_url)"
    )
    .eq("id", params.id)
    .maybeSingle();

  const spotlight = data as SpotlightDetail | null;
  if (!spotlight || spotlight.status !== "published") notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-accent">
        <span className="hex-marker" aria-hidden /> Member spotlight
        {spotlight.published_at && (
          <span className="text-ink/40">
            · {formatDate(spotlight.published_at)}
          </span>
        )}
      </p>
      <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
        {spotlight.headline}
      </h1>

      {spotlight.member && (
        <Link
          href={`/members/${spotlight.member.id}`}
          className="mt-6 inline-flex items-center gap-3"
        >
          <Avatar
            name={spotlight.member.full_name}
            src={spotlight.member.avatar_url}
            size="md"
          />
          <span>
            <span className="block text-sm font-medium text-ink">
              {spotlight.member.full_name}
            </span>
            <span className="block text-xs text-ink/60">
              {spotlight.member.designation
                ? `${spotlight.member.designation} · `
                : ""}
              {spotlight.member.company}
            </span>
          </span>
        </Link>
      )}

      {/* The metric is the visual centerpiece. */}
      <Card className="my-10 border-accent/20 px-6 py-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-ink/50">
          {spotlight.metric_label}
        </p>
        <p className="mt-3 font-mono text-3xl sm:text-5xl">
          <span className="text-ink/50 line-through decoration-danger/60">
            {spotlight.metric_before}
          </span>{" "}
          <span className="text-ink/40" aria-hidden>
            →
          </span>{" "}
          <span className="text-accent">{spotlight.metric_after}</span>
        </p>
      </Card>

      {spotlight.hero_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={spotlight.hero_image_url}
          alt=""
          className="mb-10 w-full rounded-card object-cover"
        />
      )}

      <div className="mx-auto max-w-measure">
        <Markdown source={spotlight.story_md} />
      </div>
    </article>
  );
}
