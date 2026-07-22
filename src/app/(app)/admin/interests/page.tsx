import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { InterestsTable } from "./InterestsTable";
import type { SolutionInterest } from "@/lib/database.types";

export const metadata: Metadata = { title: "Interests · Admin" };
export const dynamic = "force-dynamic";

export type InterestRow = SolutionInterest & {
  member: { full_name: string; company: string; email: string } | null;
  solution: { title: string; owner_name: string | null } | null;
};

export default async function AdminInterestsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("solution_interests")
    .select(
      "*, member:members(full_name, company, email), solution:solutions(title, owner_name)"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return <InterestsTable interests={(data ?? []) as InterestRow[]} />;
}
