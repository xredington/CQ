"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { INDUSTRY_LABELS } from "@/lib/constants";
import type { Industry, Member } from "@/lib/database.types";

type DirectoryMember = Pick<
  Member,
  | "id"
  | "full_name"
  | "designation"
  | "company"
  | "industry"
  | "country"
  | "avatar_url"
  | "status"
>;

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-line text-ink/60 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

export function MembersDirectory({ members }: { members: DirectoryMember[] }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const allIndustries = useMemo(
    () =>
      [...new Set(members.map((m) => m.industry).filter(Boolean))] as Industry[],
    [members]
  );
  const allCountries = useMemo(
    () =>
      ([...new Set(members.map((m) => m.country).filter(Boolean))] as string[]).sort(),
    [members]
  );

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return members.filter((m) => {
      if (
        q &&
        !m.full_name.toLowerCase().includes(q) &&
        !m.company.toLowerCase().includes(q)
      )
        return false;
      if (industries.length > 0 && (!m.industry || !industries.includes(m.industry)))
        return false;
      if (countries.length > 0 && (!m.country || !countries.includes(m.country)))
        return false;
      return true;
    });
  }, [members, debounced, industries, countries]);

  const toggle = <T,>(list: T[], set: (next: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const hasFilters = query !== "" || industries.length > 0 || countries.length > 0;

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or company"
          aria-label="Search members by name or company"
          className="h-11 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink/40"
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-2" aria-label="Filter by industry">
          {allIndustries.map((industry) => (
            <FilterChip
              key={industry}
              label={INDUSTRY_LABELS[industry]}
              active={industries.includes(industry)}
              onClick={() => toggle(industries, setIndustries, industry)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filter by country">
          {allCountries.map((country) => (
            <FilterChip
              key={country}
              label={country}
              active={countries.includes(country)}
              onClick={() => toggle(countries, setCountries, country)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No members match — try clearing a filter."
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setIndustries([]);
                  setCountries([]);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <Link key={m.id} href={`/members/${m.id}`} className="block">
              <Card className="flex h-full flex-col items-start gap-3 p-5 transition-colors hover:border-accent/30">
                <Avatar name={m.full_name} src={m.avatar_url} size="lg" />
                <div className="min-w-0">
                  <p className="font-display text-lg leading-tight">
                    {m.full_name}
                  </p>
                  <p className="mt-0.5 text-sm text-ink/60">
                    {m.designation ? `${m.designation} · ` : ""}
                    {m.company}
                  </p>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {m.industry && <Badge>{INDUSTRY_LABELS[m.industry]}</Badge>}
                  {m.country && <Badge>{m.country}</Badge>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
