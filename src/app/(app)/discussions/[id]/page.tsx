import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { Thread, type ThreadPost, type ThreadReply } from "./Thread";
import type { Member, Post, Reply } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type PostRow = Post & {
  author: Pick<Member, "id" | "full_name" | "company" | "designation" | "avatar_url"> | null;
  post_likes: { member_id: string }[];
};
type ReplyRow = Reply & {
  author: Pick<Member, "id" | "full_name" | "company" | "avatar_url"> | null;
};

export default async function ThreadPage({
  params,
}: {
  params: { id: string };
}) {
  const viewer = await requireMember();
  const supabase = createClient();

  const [postRes, repliesRes] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "*, author:members(id, full_name, company, designation, avatar_url), post_likes(member_id)"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase
      .from("replies")
      .select("*, author:members(id, full_name, company, avatar_url)")
      .eq("post_id", params.id)
      .order("created_at", { ascending: true }),
  ]);

  const post = postRes.data as PostRow | null;
  if (!post) notFound();

  const replies = (repliesRes.data ?? []) as ReplyRow[];

  const threadPost: ThreadPost = {
    id: post.id,
    title: post.title,
    body: post.body,
    category: post.category,
    is_pinned: post.is_pinned,
    is_locked: post.is_locked,
    created_at: post.created_at,
    author: post.author,
    likeCount: post.post_likes.length,
    likedByViewer: post.post_likes.some((l) => l.member_id === viewer.id),
  };

  const threadReplies: ThreadReply[] = replies.map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    author_id: r.author_id,
    author: r.author,
    pending: false,
    highlight: false,
  }));

  return (
    <Thread
      post={threadPost}
      initialReplies={threadReplies}
      viewer={{
        id: viewer.id,
        full_name: viewer.full_name,
        company: viewer.company,
        avatar_url: viewer.avatar_url,
        isAdmin: viewer.role === "admin",
      }}
    />
  );
}
