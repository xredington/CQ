import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SpotlightsAdmin } from "./SpotlightsAdmin";
import type { Member, Spotlight } from "@/lib/database.types";

export const metadata: Metadata = { title: "Spotlights · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSpotlightsPage() {
  const supabase = createClient();
  const [spotlightsRes, membersRes] = await Promise.all([
    supabase
      .from("spotlights")
      .select("*, member:members(full_name, company)")
      .order("updated_at", { ascending: false }),
    supabase.from("members").select("id, full_name, company").order("full_name"),
  ]);

  if (spotlightsRes.error) throw new Error(spotlightsRes.error.message);

  return (
    <SpotlightsAdmin
      spotlights={
        (spotlightsRes.data ?? []) as (Spotlight & {
          member: { full_name: string; company: string } | null;
        })[]
      }
      members={
        (membersRes.data ?? []) as Pick<Member, "id" | "full_name" | "company">[]
      }
    />
  );
}
