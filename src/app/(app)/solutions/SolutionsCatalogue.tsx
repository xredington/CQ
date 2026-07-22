"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { SOLUTION_CATEGORY_LABELS } from "@/lib/constants";
import type { Solution, SolutionCategory } from "@/lib/database.types";

type CatalogueSolution = Pick<
  Solution,
  "id" | "title" | "vendor" | "category" | "summary" | "logo_url"
>;

type Filter = "all" | SolutionCategory;

export function SolutionsCatalogue({
  solutions,
}: {
  solutions: CatalogueSolution[];
}) {
  const [category, setCategory] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const categories = useMemo(
    () => [...new Set(solutions.map((s) => s.category))] as SolutionCategory[],
    [solutions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return solutions.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (
        q &&
        !s.title.toLowerCase().includes(q) &&
        !s.vendor.toLowerCase().includes(q) &&
        !s.summary.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [solutions, category, query]);

  return (
    <div className="space-y-5">
      <Tabs<Filter>
        items={[
          { value: "all", label: "All", count: solutions.length },
          ...categories.map((c) => ({
            value: c as Filter,
            label: SOLUTION_CATEGORY_LABELS[c],
          })),
        ]}
        value={category}
        onChange={setCategory}
      />
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search solutions"
          aria-label="Search solutions"
          className="h-11 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink/40"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No solutions match"
          description="Try a different category or clear the search."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((s) => (
            <Link key={s.id} href={`/solutions/${s.id}`} className="block">
              <Card className="flex h-full flex-col p-5 transition-colors hover:border-accent/30">
                <div className="mb-3 flex items-start justify-between gap-3">
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.logo_url}
                      alt=""
                      className="h-9 w-9 rounded object-contain"
                    />
                  ) : (
                    <span
                      className="hex-clip flex h-9 w-9 items-center justify-center bg-raised font-display text-sm text-accent"
                      aria-hidden
                    >
                      {s.vendor[0]}
                    </span>
                  )}
                  <Badge>{SOLUTION_CATEGORY_LABELS[s.category]}</Badge>
                </div>
                <p className="font-display text-lg leading-snug">{s.title}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wider text-ink/50">
                  {s.vendor}
                </p>
                <p className="mt-2.5 text-sm leading-relaxed text-ink/70">
                  {s.summary}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
