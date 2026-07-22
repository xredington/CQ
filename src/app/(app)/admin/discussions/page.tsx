import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DiscussionsModeration } from "./DiscussionsModeration";
import type { Post } from "@/lib/database.types";

export const metadata: Metadata = { title: "Discussions · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDiscussionsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*, author:members(full_name, company), replies(id)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <DiscussionsModeration
      posts={
        (data ?? []) as (Post & {
          author: { full_name: string; company: string } | null;
          replies: { id: string }[];
        })[]
      }
    />
  );
}
