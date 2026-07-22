import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { SolutionsCatalogue } from "./SolutionsCatalogue";
import type { Solution } from "@/lib/database.types";

export const metadata: Metadata = { title: "Solutions" };
export const dynamic = "force-dynamic";

export default async function SolutionsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("solutions")
    .select("id, title, vendor, category, summary, logo_url")
    .eq("status", "published")
    .order("title");

  if (error) throw new Error(error.message);

  return (
    <div>
      <PageHeader
        title="Solutions"
        description="The AI use-case catalogue — raise your hand and the Redington solution owner reaches out."
      />
      <SolutionsCatalogue
        solutions={
          (data ?? []) as Pick<
            Solution,
            "id" | "title" | "vendor" | "category" | "summary" | "logo_url"
          >[]
        }
      />
    </div>
  );
}
