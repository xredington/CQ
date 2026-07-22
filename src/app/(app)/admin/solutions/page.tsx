import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SolutionsAdmin } from "./SolutionsAdmin";
import type { Solution } from "@/lib/database.types";

export const metadata: Metadata = { title: "Solutions · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSolutionsPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("solutions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return <SolutionsAdmin solutions={(data ?? []) as Solution[]} />;
}
