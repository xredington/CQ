"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import type { Reply } from "@/lib/database.types";

const postSchema = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Give it a title of at least 8 characters.")
    .max(140, "Keep the title under 140 characters."),
  category: z.enum(["copilot", "ai-use-cases", "implementation-help", "general"]),
  body: z.string().trim().min(20, "Say a bit more — at least 20 characters."),
});

export async function createPost(
  input: unknown
): Promise<{ id?: string; error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { error: "You're signed out. Sign in and try again." };

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...parsed.data, author_id: member.id })
    .select("id")
    .single();

  if (error || !data) return { error: "The discussion couldn't be posted. Try again." };
  revalidatePath("/discussions");
  return { id: data.id as string };
}

const editPostSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(20, "Say a bit more — at least 20 characters."),
});

export async function updatePostBody(input: unknown): Promise<{ error?: string }> {
  const parsed = editPostSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("posts")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.postId);
  if (error) return { error: "The edit couldn't be saved. Try again." };
  revalidatePath(`/discussions/${parsed.data.postId}`);
  return {};
}

export async function deletePost(postId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(postId).success) return { error: "Something's off with that request." };
  const supabase = createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { error: "The discussion couldn't be deleted. Try again." };
  revalidatePath("/discussions");
  return {};
}

const replySchema = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(2, "Write a reply first."),
});

export async function createReply(
  input: unknown
): Promise<{ reply?: Reply; error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { error: "You're signed out. Sign in and try again." };

  const parsed = replySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a reply first." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("replies")
    .insert({
      post_id: parsed.data.postId,
      author_id: member.id,
      body: parsed.data.body,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { error: "Your reply couldn't be posted. It may be a locked discussion." };
  }
  revalidatePath(`/discussions/${parsed.data.postId}`);
  return { reply: data as Reply };
}

const editReplySchema = z.object({
  replyId: z.string().uuid(),
  body: z.string().trim().min(2, "Write a reply first."),
});

export async function updateReply(input: unknown): Promise<{ error?: string }> {
  const parsed = editReplySchema.safeParse(input);
  if (!parsed.success) return { error: "Write a reply first." };
  const supabase = createClient();
  const { error } = await supabase
    .from("replies")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.replyId);
  if (error) return { error: "The edit couldn't be saved. Try again." };
  return {};
}

export async function deleteReply(replyId: string): Promise<{ error?: string }> {
  if (!z.string().uuid().safeParse(replyId).success) return { error: "Something's off with that request." };
  const supabase = createClient();
  const { error } = await supabase.from("replies").delete().eq("id", replyId);
  if (error) return { error: "The reply couldn't be deleted. Try again." };
  return {};
}

export async function toggleLike(
  postId: string
): Promise<{ liked?: boolean; error?: string }> {
  const member = await getCurrentMember();
  if (!member) return { error: "You're signed out. Sign in and try again." };
  if (!z.string().uuid().safeParse(postId).success) return { error: "Something's off with that request." };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("member_id", member.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("post_likes")
      .delete()
      .eq("id", existing.id as string);
    if (error) return { error: "That didn't save. Try again." };
    return { liked: false };
  }

  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, member_id: member.id });
  if (error && error.code !== "23505") return { error: "That didn't save. Try again." };
  return { liked: true };
}
