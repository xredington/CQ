"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Lock, MessageSquare, Pin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { POST_CATEGORY_LABELS, POST_CATEGORIES } from "@/lib/constants";
import { relativeTime } from "@/lib/dates";
import type { PostCategory } from "@/lib/database.types";

export interface ListPost {
  id: string;
  title: string;
  category: PostCategory;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  authorName: string;
  authorCompany: string;
  replyCount: number;
  likeCount: number;
  lastActive: string;
}

type Sort = "active" | "new" | "top";

export function DiscussionsList({ posts }: { posts: ListPost[] }) {
  const [sort, setSort] = useState<Sort>("active");
  const [category, setCategory] = useState<PostCategory | null>(null);

  const sorted = useMemo(() => {
    const filtered = category
      ? posts.filter((p) => p.category === category)
      : posts;
    const compare: Record<Sort, (a: ListPost, b: ListPost) => number> = {
      active: (a, b) => b.lastActive.localeCompare(a.lastActive),
      new: (a, b) => b.created_at.localeCompare(a.created_at),
      top: (a, b) => b.likeCount - a.likeCount,
    };
    return [...filtered].sort((a, b) => {
      // Pinned posts always first (brief §8).
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return compare[sort](a, b);
    });
  }, [posts, sort, category]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Sort discussions"
          className="flex overflow-hidden rounded-md border border-line"
        >
          {(
            [
              ["active", "Active"],
              ["new", "New"],
              ["top", "Top"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setSort(value)}
              aria-pressed={sort === value}
              className={`px-3.5 py-1.5 text-sm transition-colors ${
                sort === value
                  ? "bg-ink/10 text-ink"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filter by category">
          {POST_CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(category === c ? null : c)}
              aria-pressed={category === c}
              className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
                category === c
                  ? "border-accent/60 bg-accent/10 text-accent"
                  : "border-line text-ink/60 hover:text-ink"
              }`}
            >
              {POST_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {sorted.length === 0 ? (
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
          {sorted.map((post) => (
            <Link
              key={post.id}
              href={`/discussions/${post.id}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  {post.is_pinned && (
                    <Pin className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Pinned" />
                  )}
                  {post.is_locked && (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-ink/40" aria-label="Locked" />
                  )}
                  <span className="truncate">{post.title}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-ink/50">
                  {post.authorName}
                  {post.authorCompany ? ` · ${post.authorCompany}` : ""} ·{" "}
                  {relativeTime(post.lastActive)}
                </p>
              </div>
              <Badge className="hidden sm:inline-flex">
                {POST_CATEGORY_LABELS[post.category]}
              </Badge>
              <span className="flex w-9 items-center gap-1 text-xs text-ink/50">
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                {post.replyCount}
              </span>
              <span className="flex w-9 items-center gap-1 text-xs text-ink/50">
                <Heart className="h-3.5 w-3.5" aria-hidden />
                {post.likeCount}
              </span>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
