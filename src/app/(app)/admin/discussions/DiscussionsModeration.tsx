"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, LockOpen, Pin, PinOff } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { POST_CATEGORY_LABELS } from "@/lib/constants";
import { relativeTime } from "@/lib/dates";
import type { Post } from "@/lib/database.types";
import { adminDeletePost, setLocked, setPinned } from "./actions";

type ModerationPost = Post & {
  author: { full_name: string; company: string } | null;
  replies: { id: string }[];
};

export function DiscussionsModeration({ posts }: { posts: ModerationPost[] }) {
  const [deleting, setDeleting] = useState<ModerationPost | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const togglePin = async (post: ModerationPost) => {
    setBusyId(post.id);
    const result = await setPinned({ postId: post.id, value: !post.is_pinned });
    setBusyId(null);
    if (result.error) return toast(result.error, "error");
    toast(post.is_pinned ? "Unpinned" : "Pinned");
    router.refresh();
  };

  const toggleLock = async (post: ModerationPost) => {
    setBusyId(post.id);
    const result = await setLocked({ postId: post.id, value: !post.is_locked });
    setBusyId(null);
    if (result.error) return toast(result.error, "error");
    toast(post.is_locked ? "Unlocked" : "Locked");
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    const result = await adminDeletePost(deleting.id);
    setBusyId(null);
    setDeleting(null);
    if (result.error) return toast(result.error, "error");
    toast("Discussion deleted");
    router.refresh();
  };

  if (posts.length === 0) {
    return (
      <EmptyState
        title="No discussions to moderate"
        description="Threads appear here as members post."
      />
    );
  }

  return (
    <>
      <Card className="divide-y divide-line-soft">
        {posts.map((post) => (
          <div key={post.id} className="flex items-center gap-3 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <Link
                href={`/discussions/${post.id}`}
                className="block truncate text-sm font-medium hover:text-accent"
              >
                {post.title}
              </Link>
              <p className="mt-0.5 truncate text-xs text-ink/50">
                {post.author?.full_name} · {post.author?.company} ·{" "}
                {relativeTime(post.created_at)} · {post.replies.length} replies
              </p>
            </div>
            <Badge className="hidden sm:inline-flex">
              {POST_CATEGORY_LABELS[post.category]}
            </Badge>
            {post.is_pinned && <Badge tone="accent">pinned</Badge>}
            {post.is_locked && <Badge>locked</Badge>}
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === post.id}
                onClick={() => togglePin(post)}
                aria-label={post.is_pinned ? "Unpin" : "Pin"}
                title={post.is_pinned ? "Unpin" : "Pin"}
              >
                {post.is_pinned ? (
                  <PinOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Pin className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === post.id}
                onClick={() => toggleLock(post)}
                aria-label={post.is_locked ? "Unlock" : "Lock"}
                title={post.is_locked ? "Unlock" : "Lock"}
              >
                {post.is_locked ? (
                  <LockOpen className="h-4 w-4" aria-hidden />
                ) : (
                  <Lock className="h-4 w-4" aria-hidden />
                )}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busyId === post.id}
                onClick={() => setDeleting(post)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete discussion"
      >
        <p className="text-sm text-ink/80">
          Delete &ldquo;{deleting?.title}&rdquo; and its{" "}
          {deleting?.replies.length ?? 0} replies? This can&apos;t be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            loading={busyId === deleting?.id}
          >
            Delete discussion
          </Button>
        </div>
      </Modal>
    </>
  );
}
