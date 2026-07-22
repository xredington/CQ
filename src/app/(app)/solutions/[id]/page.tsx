import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Markdown } from "@/components/Markdown";
import { SOLUTION_CATEGORY_LABELS } from "@/lib/constants";
import { InterestButton } from "./InterestButton";
import type { Solution } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function SolutionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const member = await requireMember();
  const supabase = createClient();

  const [solutionRes, interestRes] = await Promise.all([
    supabase.from("solutions").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("solution_interests")
      .select("id")
      .eq("solution_id", params.id)
      .eq("member_id", member.id)
      .maybeSingle(),
  ]);

  const solution = solutionRes.data as Solution | null;
  if (!solution || solution.status !== "published") notFound();

  return (
    <article className="max-w-3xl">
      <div className="mb-2 flex items-center gap-2">
        <Badge>{SOLUTION_CATEGORY_LABELS[solution.category]}</Badge>
        <span className="text-xs uppercase tracking-wider text-ink/50">
          {solution.vendor}
        </span>
      </div>
      <h1 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
        {solution.title}
      </h1>
      <p className="mt-3 max-w-measure text-ink/70">{solution.summary}</p>

      <div className="mt-6">
        <InterestButton
          solutionId={solution.id}
          alreadyInterested={Boolean(interestRes.data)}
        />
      </div>

      {solution.description && (
        <section className="mt-10">
          <Markdown source={solution.description} />
        </section>
      )}

      {solution.outcomes && (
        <Card className="mt-10 border-accent/20 p-6">
          <h2 className="mb-3 flex items-center gap-2.5 font-display text-xl">
            <span className="hex-marker" aria-hidden /> Outcomes
          </h2>
          <Markdown source={solution.outcomes} />
        </Card>
      )}
    </article>
  );
}
