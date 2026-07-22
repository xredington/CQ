"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Lock, Pencil, Pin, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Markdown } from "@/components/Markdown";
import { createClient } from "@/lib/supabase/client";
import { POST_CATEGORY_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/dates";
import type { PostCategory, Reply } from "@/lib/database.types";
import {
  createReply,
  deletePost,
  deleteReply,
  toggleLike,
  updatePostBody,
  updateReply,
} from "../actions";

interface ReplyAuthor {
  id: string;
  full_name: string;
  company: string;
  avatar_url: string | null;
}

export interface ThreadPost {
  id: string;
  title: string;
  body: string;
  category: PostCategory;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  author: (ReplyAuthor & { designation: string | null }) | null;
  likeCount: number;
  likedByViewer: boolean;
}

export interface ThreadReply {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author: ReplyAuthor | null;
  pending: boolean;
  highlight: boolean;
}

interface Viewer {
  id: string;
  full_name: string;
  company: string;
  avatar_url: string | null;
  isAdmin: boolean;
}

function LikeButton({ post }: { post: ThreadPost }) {
  const [liked, setLiked] = useState(post.likedByViewer);
  const [count, setCount] = useState(post.likeCount);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  const onToggle = () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setCount((c) => c + (nextLiked ? 1 : -1));
    startTransition(async () => {
      const result = await toggleLike(post.id);
      if (result.error) {
        setLiked(!nextLiked);
        setCount((c) => c + (nextLiked ? -1 : 1));
        toast(result.error, "error");
      }
    });
  };

  return (
    <button
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? "Unlike this discussion" : "Like this discussion"}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        liked
          ? "border-accent/60 bg-accent/10 text-accent"
          : "border-line text-ink/60 hover:text-ink"
      }`}
    >
      <Heart
        className={`h-4 w-4 ${liked ? "fill-accent" : ""}`}
        aria-hidden
      />
      <span className="font-mono text-xs">{count}</span>
    </button>
  );
}

function ReplyItem({
  reply,
  viewer,
  onDeleted,
  onEdited,
}: {
  reply: ThreadReply;
  viewer: Viewer;
  onDeleted: (id: string) => void;
  onEdited: (id: string, body: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState(reply.body);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const own = reply.author_id === viewer.id;

  const saveEdit = async () => {
    setBusy(true);
    const result = await updateReply({ replyId: reply.id, body: draft });
    setBusy(false);
    if (result.error) return toast(result.error, "error");
    onEdited(reply.id, draft);
    setEditing(false);
  };

  const confirmDeleteNow = async () => {
    setBusy(true);
    const result = await deleteReply(reply.id);
    setBusy(false);
    setConfirmDelete(false);
    if (result.error) return toast(result.error, "error");
    onDeleted(reply.id);
  };

  return (
    <div
      className={`flex gap-3 rounded-md px-2 py-3 transition-colors sm:px-3 ${
        reply.highlight ? "bg-accent/[0.07]" : ""
      } ${reply.pending ? "opacity-60" : ""}`}
    >
      <Avatar
        name={reply.author?.full_name ?? "Member"}
        src={reply.author?.avatar_url}
        size="sm"
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink/50">
          <span className="font-medium text-ink/80">
            {reply.author?.full_name ?? "Former member"}
          </span>
          {reply.author?.company ? ` · ${reply.author.company}` : ""} ·{" "}
          {reply.pending ? "sending…" : relativeTime(reply.created_at)}
        </p>
        {editing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Edit reply"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEdit} loading={busy}>
                Save changes
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setDraft(reply.body);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
            {reply.body}
          </p>
        )}
      </div>
      {(own || viewer.isAdmin) && !reply.pending && !editing && (
        <div className="flex shrink-0 gap-0.5">
          {own && (
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit reply"
              className="rounded p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete reply"
            className="rounded p-1.5 text-ink/40 hover:bg-ink/5 hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete reply"
      >
        <p className="text-sm text-ink/80">
          Delete this reply? This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDeleteNow} loading={busy}>
            Delete reply
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export function Thread({
  post,
  initialReplies,
  viewer,
}: {
  post: ThreadPost;
  initialReplies: ThreadReply[];
  viewer: Viewer;
}) {
  const [replies, setReplies] = useState<ThreadReply[]>(initialReplies);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [postBody, setPostBody] = useState(post.body);
  const [postDraft, setPostDraft] = useState(post.body);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [busy, setBusy] = useState(false);
  const repliesRef = useRef(replies);
  repliesRef.current = replies;
  const router = useRouter();
  const { toast } = useToast();

  const ownPost = post.author?.id === viewer.id;

  // Realtime: new replies from others append instantly with a brief highlight.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`replies:${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "replies",
          filter: `post_id=eq.${post.id}`,
        },
        async (payload) => {
          const incoming = payload.new as Reply;
          if (repliesRef.current.some((r) => r.id === incoming.id)) return;
          if (incoming.author_id === viewer.id) return; // own replies are optimistic
          const { data: author } = await supabase
            .from("members")
            .select("id, full_name, company, avatar_url")
            .eq("id", incoming.author_id)
            .maybeSingle();
          setReplies((prev) =>
            prev.some((r) => r.id === incoming.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: incoming.id,
                    body: incoming.body,
                    created_at: incoming.created_at,
                    author_id: incoming.author_id,
                    author: (author as ReplyAuthor | null) ?? null,
                    pending: false,
                    highlight: true,
                  },
                ]
          );
          setTimeout(() => {
            setReplies((prev) =>
              prev.map((r) =>
                r.id === incoming.id ? { ...r, highlight: false } : r
              )
            );
          }, 2500);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "replies",
        },
        (payload) => {
          const removed = payload.old as { id?: string };
          if (removed.id) {
            setReplies((prev) => prev.filter((r) => r.id !== removed.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, viewer.id]);

  const submitReply = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: ThreadReply = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      author_id: viewer.id,
      author: {
        id: viewer.id,
        full_name: viewer.full_name,
        company: viewer.company,
        avatar_url: viewer.avatar_url,
      },
      pending: true,
      highlight: false,
    };
    setReplies((prev) => [...prev, optimistic]);
    setDraft("");

    const result = await createReply({ postId: post.id, body });
    setSending(false);
    if (result.error || !result.reply) {
      // Rollback + toast (Phase 3 acceptance).
      setReplies((prev) => prev.filter((r) => r.id !== tempId));
      setDraft(body);
      toast(result.error ?? "Your reply couldn't be posted. Try again.", "error");
      return;
    }
    const real = result.reply;
    setReplies((prev) =>
      prev.map((r) =>
        r.id === tempId
          ? { ...r, id: real.id, created_at: real.created_at, pending: false }
          : r
      )
    );
  };

  const savePostEdit = async () => {
    setBusy(true);
    const result = await updatePostBody({ postId: post.id, body: postDraft });
    setBusy(false);
    if (result.error) return toast(result.error, "error");
    setPostBody(postDraft);
    setEditingPost(false);
    toast("Changes saved");
  };

  const deletePostNow = async () => {
    setBusy(true);
    const result = await deletePost(post.id);
    setBusy(false);
    if (result.error) {
      setConfirmDeletePost(false);
      return toast(result.error, "error");
    }
    toast("Discussion deleted");
    router.push("/discussions");
  };

  return (
    <div className="mx-auto flex min-h-[calc(100svh-8rem)] max-w-3xl flex-col">
      <article>
        <div className="flex items-center gap-2">
          {post.is_pinned && (
            <Badge tone="accent">
              <Pin className="mr-1 h-3 w-3" aria-hidden /> Pinned
            </Badge>
          )}
          <Badge>{POST_CATEGORY_LABELS[post.category]}</Badge>
          <span className="text-xs text-ink/50">
            {relativeTime(post.created_at)}
          </span>
        </div>
        <h1 className="mt-3 font-display text-3xl leading-tight tracking-tight">
          {post.title}
        </h1>
        {post.author && (
          <p className="mt-2 text-sm text-ink/60">
            {post.author.full_name}
            {post.author.designation ? `, ${post.author.designation}` : ""} ·{" "}
            {post.author.company}
          </p>
        )}

        {editingPost ? (
          <div className="mt-5 space-y-2">
            <Textarea
              rows={8}
              value={postDraft}
              onChange={(e) => setPostDraft(e.target.value)}
              aria-label="Edit discussion body"
              hint="Bold, lists and links supported"
            />
            <div className="flex gap-2">
              <Button onClick={savePostEdit} loading={busy}>
                Save changes
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingPost(false);
                  setPostDraft(postBody);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <Markdown source={postBody} />
          </div>
        )}

        <div className="mt-6 flex items-center gap-2">
          <LikeButton post={post} />
          {ownPost && !editingPost && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingPost(true)}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
            </Button>
          )}
          {(ownPost || viewer.isAdmin) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDeletePost(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
            </Button>
          )}
        </div>
      </article>

      <section className="mt-8 flex-1 border-t border-line-soft pt-4">
        <h2 className="mb-2 flex items-center gap-2 text-sm text-ink/60">
          <span className="hex-marker" aria-hidden />
          {replies.length === 0
            ? "No replies yet"
            : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
        </h2>
        <div className="divide-y divide-line-soft">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              viewer={viewer}
              onDeleted={(id) =>
                setReplies((prev) => prev.filter((r) => r.id !== id))
              }
              onEdited={(id, body) =>
                setReplies((prev) =>
                  prev.map((r) => (r.id === id ? { ...r, body } : r))
                )
              }
            />
          ))}
        </div>
      </section>

      {/* Composer pinned at the bottom of the thread. */}
      <div className="sticky bottom-0 mt-6 border-t border-line-soft bg-bg pb-4 pt-4">
        {post.is_locked ? (
          <Card className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-ink/60">
            <Lock className="h-4 w-4" aria-hidden /> This discussion is locked.
          </Card>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add your reply"
              aria-label="Add your reply"
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitReply();
              }}
            />
            <Button
              onClick={submitReply}
              loading={sending}
              disabled={draft.trim() === ""}
            >
              Post reply
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={confirmDeletePost}
        onClose={() => setConfirmDeletePost(false)}
        title="Delete discussion"
      >
        <p className="text-sm text-ink/80">
          Delete this discussion and all its replies? This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDeletePost(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={deletePostNow} loading={busy}>
            Delete discussion
          </Button>
        </div>
      </Modal>
    </div>
  );
}
