import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { MembersDirectory } from "./MembersDirectory";
import type { Member } from "@/lib/database.types";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("members")
    .select(
      "id, full_name, designation, company, industry, country, avatar_url, status"
    )
    .neq("status", "deactivated")
    .order("full_name");

  if (error) throw new Error(error.message);

  return (
    <div>
      <PageHeader
        title="Members"
        description="The leaders in the Hive — search by name or company."
      />
      <MembersDirectory
        members={
          (data ?? []) as Pick<
            Member,
            | "id"
            | "full_name"
            | "designation"
            | "company"
            | "industry"
            | "country"
            | "avatar_url"
            | "status"
          >[]
        }
      />
    </div>
  );
}
