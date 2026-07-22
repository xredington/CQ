import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Member } from "@/lib/database.types";

/** The signed-in user's member row, or null. Cached per request. */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("members")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return (data as Member | null) ?? null;
});

/** Requires an active member; redirects otherwise. */
export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.status === "deactivated") redirect("/auth/signout?reason=paused");
  return member;
}

/** Requires an active admin; members are sent home. */
export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/");
  return member;
}
