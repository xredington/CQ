"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs } from "@/components/ui/Tabs";
import { INDUSTRY_LABELS } from "@/lib/constants";
import type { Industry, MemberRole, MemberStatus } from "@/lib/database.types";

export interface TreeMember {
  id: string;
  full_name: string;
  company: string;
  industry: Industry | null;
  country: string | null;
  avatar_url: string | null;
  referred_by: string | null;
  joined_event_id: string | null;
  joined_event_name: string | null;
  status: MemberStatus;
  role: MemberRole;
  created_at: string;
  direct_recruits: number;
  total_downline: number;
}

const STATUS_TONE = {
  active: "success",
  invited: "neutral",
  deactivated: "danger",
} as const;

function NodePopover({
  member,
  childrenOf,
  onClose,
}: {
  member: TreeMember;
  childrenOf: Map<string | null, TreeMember[]>;
  onClose: () => void;
}) {
  const downline = childrenOf.get(member.id) ?? [];
  return (
    <Card className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[85vw] border-line bg-raised p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display">{member.full_name}</p>
          <p className="text-xs text-ink/60">{member.company}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="rounded p-1 text-ink/50 hover:bg-ink/5"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-ink/50">Status</dt>
          <dd>
            <Badge tone={STATUS_TONE[member.status]}>{member.status}</Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink/50">Joined at</dt>
          <dd className="text-ink/80">
            {member.joined_event_name ?? "Direct (no event)"}
          </dd>
        </div>
        {member.industry && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink/50">Industry</dt>
            <dd className="text-ink/80">{INDUSTRY_LABELS[member.industry]}</dd>
          </div>
        )}
        {member.country && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink/50">Country</dt>
            <dd className="text-ink/80">{member.country}</dd>
          </div>
        )}
      </dl>
      <div className="mt-3 border-t border-line-soft pt-3">
        <p className="mb-1.5 text-xs text-ink/50">
          Downline · {member.direct_recruits} direct, {member.total_downline}{" "}
          total
        </p>
        {downline.length === 0 ? (
          <p className="text-xs text-ink/40">No recruits yet.</p>
        ) : (
          <ul className="max-h-32 space-y-1 overflow-y-auto">
            {downline.map((d) => (
              <li key={d.id} className="truncate text-xs text-ink/80">
                {d.full_name}{" "}
                <span className="text-ink/40">· {d.company}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link
        href={`/members/${member.id}`}
        className="mt-3 inline-block text-xs text-accent underline underline-offset-2"
      >
        Open profile
      </Link>
    </Card>
  );
}

function TreeNode({
  member,
  childrenOf,
  depth,
  expanded,
  toggle,
  openPopover,
  setOpenPopover,
  highlightId,
  matchesFilter,
}: {
  member: TreeMember;
  childrenOf: Map<string | null, TreeMember[]>;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  openPopover: string | null;
  setOpenPopover: (id: string | null) => void;
  highlightId: string | null;
  matchesFilter: (m: TreeMember) => boolean;
}) {
  const children = childrenOf.get(member.id) ?? [];
  const isExpanded = expanded.has(member.id);
  const highlighted = highlightId === member.id;
  const dimmed = !matchesFilter(member);

  return (
    <div className="relative">
      <div
        id={`hive-node-${member.id}`}
        className={`relative flex items-center gap-3 rounded-md px-2 py-2 transition-colors ${
          highlighted ? "bg-accent/15 ring-1 ring-accent/50" : "hover:bg-ink/[0.03]"
        } ${dimmed ? "opacity-35" : ""}`}
        style={{ marginLeft: `${depth * 1.75}rem` }}
      >
        {depth > 0 && (
          <span
            className="absolute -left-4 top-1/2 h-px w-4 bg-line"
            aria-hidden
          />
        )}
        <button
          onClick={() => toggle(member.id)}
          disabled={children.length === 0}
          aria-label={
            children.length === 0
              ? undefined
              : isExpanded
                ? `Collapse ${member.full_name}`
                : `Expand ${member.full_name}`
          }
          aria-expanded={children.length > 0 ? isExpanded : undefined}
          className={`rounded p-0.5 ${
            children.length === 0
              ? "invisible"
              : "text-ink/50 hover:bg-ink/5 hover:text-ink"
          }`}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden />
          )}
        </button>
        <button
          onClick={() =>
            setOpenPopover(openPopover === member.id ? null : member.id)
          }
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Avatar name={member.full_name} src={member.avatar_url} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {member.full_name}
              {member.role === "admin" && (
                <span className="ml-1.5 text-xs text-accent">admin</span>
              )}
            </span>
            <span className="block truncate text-xs text-ink/50">
              {member.company}
            </span>
          </span>
          <span className="hidden shrink-0 text-right font-mono text-xs text-ink/50 sm:block">
            {member.direct_recruits} direct
            <span className="block">{member.total_downline} downline</span>
          </span>
        </button>
        {openPopover === member.id && (
          <NodePopover
            member={member}
            childrenOf={childrenOf}
            onClose={() => setOpenPopover(null)}
          />
        )}
      </div>
      {isExpanded && (
        <div className="relative">
          <span
            className="absolute bottom-3 top-0 w-px bg-line"
            style={{ left: `${depth * 1.75 + 0.9}rem` }}
            aria-hidden
          />
          {children.map((child) => (
            <TreeNode
              key={child.id}
              member={child}
              childrenOf={childrenOf}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              openPopover={openPopover}
              setOpenPopover={setOpenPopover}
              highlightId={highlightId}
              matchesFilter={matchesFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HiveTreeExplorer({ members }: { members: TreeMember[] }) {
  const [tab, setTab] = useState<"tree" | "leaderboard">("tree");
  const [query, setQuery] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [country, setCountry] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(members.filter((m) => m.direct_recruits > 0).map((m) => m.id))
  );
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const childrenOf = useMemo(() => {
    const map = new Map<string | null, TreeMember[]>();
    for (const m of members) {
      const key = m.referred_by;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return map;
  }, [members]);

  const byId = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );
  const roots = childrenOf.get(null) ?? [];

  const countries = useMemo(
    () =>
      ([...new Set(members.map((m) => m.country).filter(Boolean))] as string[]).sort(),
    [members]
  );
  const industriesInUse = useMemo(
    () =>
      [...new Set(members.map((m) => m.industry).filter(Boolean))] as Industry[],
    [members]
  );
  const eventsInUse = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of members) {
      if (m.joined_event_id && m.joined_event_name) {
        seen.set(m.joined_event_id, m.joined_event_name);
      }
    }
    return [...seen.entries()];
  }, [members]);

  const matchesFilter = (m: TreeMember) => {
    if (industry && m.industry !== industry) return false;
    if (country && m.country !== country) return false;
    if (eventId && m.joined_event_id !== eventId) return false;
    return true;
  };

  // Search jumps to and highlights the first matching member.
  const jumpTo = (id: string) => {
    // Expand every ancestor so the node is visible.
    const next = new Set(expanded);
    let cursor = byId.get(id)?.referred_by ?? null;
    while (cursor) {
      next.add(cursor);
      cursor = byId.get(cursor)?.referred_by ?? null;
    }
    setExpanded(next);
    setHighlightId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 3000);
    requestAnimationFrame(() => {
      document
        .getElementById(`hive-node-${id}`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  };

  const searchMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return members
      .filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.company.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [members, query]);

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  const leaderboard = [...members]
    .filter((m) => m.total_downline > 0)
    .sort((a, b) => b.total_downline - a.total_downline);

  return (
    <div className="space-y-5">
      <Tabs<"tree" | "leaderboard">
        items={[
          { value: "tree", label: "Tree" },
          { value: "leaderboard", label: "Leaderboard", count: leaderboard.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "tree" && (
        <>
          <div className="flex flex-wrap gap-2.5">
            <div className="relative min-w-52 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a member"
                aria-label="Find a member in the tree"
                className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink/40"
              />
              {searchMatches.length > 0 && (
                <Card className="absolute inset-x-0 top-11 z-40 divide-y divide-line-soft bg-raised shadow-xl">
                  {searchMatches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        jumpTo(m.id);
                        setQuery("");
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-ink/5"
                    >
                      <Avatar name={m.full_name} src={m.avatar_url} size="xs" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">
                          {m.full_name}
                        </span>
                        <span className="block truncate text-xs text-ink/50">
                          {m.company}
                        </span>
                      </span>
                    </button>
                  ))}
                </Card>
              )}
            </div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              aria-label="Filter by industry"
              className="h-10 rounded-md border border-line bg-bg px-3 text-sm text-ink"
            >
              <option value="">All industries</option>
              {industriesInUse.map((i) => (
                <option key={i} value={i}>
                  {INDUSTRY_LABELS[i]}
                </option>
              ))}
            </select>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              aria-label="Filter by country"
              className="h-10 rounded-md border border-line bg-bg px-3 text-sm text-ink"
            >
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              aria-label="Filter by joining event"
              className="h-10 rounded-md border border-line bg-bg px-3 text-sm text-ink"
            >
              <option value="">All events</option>
              {eventsInUse.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {roots.length === 0 ? (
            <EmptyState
              title="No members yet"
              description="Import the member list to see the Hive take shape."
            />
          ) : (
            <Card className="p-3 sm:p-4">
              {roots.map((root) => (
                <TreeNode
                  key={root.id}
                  member={root}
                  childrenOf={childrenOf}
                  depth={0}
                  expanded={expanded}
                  toggle={(id) =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    })
                  }
                  openPopover={openPopover}
                  setOpenPopover={setOpenPopover}
                  highlightId={highlightId}
                  matchesFilter={matchesFilter}
                />
              ))}
            </Card>
          )}
        </>
      )}

      {tab === "leaderboard" &&
        (leaderboard.length === 0 ? (
          <EmptyState
            title="No recruiters yet"
            description="The leaderboard fills in as members grow their Hives."
          />
        ) : (
          <Card className="divide-y divide-line-soft">
            {leaderboard.map((m, i) => (
              <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="w-6 font-mono text-sm text-ink/40">
                  {i + 1}
                </span>
                <Avatar name={m.full_name} src={m.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.full_name}</p>
                  <p className="truncate text-xs text-ink/50">
                    {m.company}
                    {m.country ? ` · ${m.country}` : ""}
                  </p>
                </div>
                <div className="text-right font-mono text-sm">
                  {m.direct_recruits}
                  <span className="text-ink/40"> direct</span>
                  <span className="block text-xs text-accent">
                    {m.total_downline} total downline
                  </span>
                </div>
              </div>
            ))}
          </Card>
        ))}
    </div>
  );
}
