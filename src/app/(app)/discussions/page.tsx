import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/Button";
import { DiscussionsList, type ListPost } from "./DiscussionsList";
import type { Post } from "@/lib/database.types";

export const metadata: Metadata = { title: "Discussions" };
export const dynamic = "force-dynamic";

type PostRow = Post & {
  author: { full_name: string; company: string } | null;
  replies: { created_at: string }[];
  post_likes: { member_id: string }[];
};

export default async function DiscussionsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      "*, author:members(full_name, company), replies(created_at), post_likes(member_id)"
    );

  if (error) throw new Error(error.message);

  const posts: ListPost[] = ((data ?? []) as PostRow[]).map((p) => ({
    id: p.id,
    title: p.title,
    category: p.category,
    is_pinned: p.is_pinned,
    is_locked: p.is_locked,
    created_at: p.created_at,
    authorName: p.author?.full_name ?? "Former member",
    authorCompany: p.author?.company ?? "",
    replyCount: p.replies.length,
    likeCount: p.post_likes.length,
    lastActive: p.replies.reduce(
      (latest, r) => (r.created_at > latest ? r.created_at : latest),
      p.created_at
    ),
  }));

  return (
    <div>
      <PageHeader
        title="Discussions"
        description="Peer-to-peer, off the record, with real numbers."
        action={
          <Link href="/discussions/new">
            <Button size="lg">Start a discussion</Button>
          </Link>
        }
      />
      <DiscussionsList posts={posts} />
    </div>
  );
}
