import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Spotlight } from "@/lib/database.types";

export const metadata: Metadata = { title: "Spotlights" };
export const dynamic = "force-dynamic";

type SpotlightCard = Spotlight & {
  member: { full_name: string; company: string; avatar_url: string | null } | null;
};

export default async function SpotlightsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("spotlights")
    .select("*, member:members(full_name, company, avatar_url)")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);
  const spotlights = (data ?? []) as SpotlightCard[];

  return (
    <div>
      <PageHeader
        title="Spotlights"
        description="Real results from the Hive — told with the numbers."
      />
      {spotlights.length === 0 ? (
        <EmptyState
          title="No spotlights yet"
          description="Member success stories land here once the first one is published."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {spotlights.map((s) => (
            <Link key={s.id} href={`/spotlights/${s.id}`} className="block">
              <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-accent/30">
                {s.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.hero_image_url}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-raised/60">
                    {s.member && (
                      <Avatar
                        name={s.member.full_name}
                        src={s.member.avatar_url}
                        size="lg"
                      />
                    )}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-display text-xl leading-snug">
                    {s.headline}
                  </p>
                  {s.member && (
                    <p className="mt-1.5 text-sm text-ink/60">
                      {s.member.full_name} · {s.member.company}
                    </p>
                  )}
                  <p className="mt-auto pt-4 font-mono text-lg">
                    <span className="text-ink/50 line-through decoration-danger/60">
                      {s.metric_before}
                    </span>{" "}
                    <span aria-hidden>→</span>{" "}
                    <span className="text-accent">{s.metric_after}</span>
                  </p>
                  <p className="mt-0.5 text-xs uppercase tracking-wider text-ink/50">
                    {s.metric_label}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
