import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const supabase = createClient();
  await supabase.auth.signOut();

  const reason = searchParams.get("reason");
  const target = reason ? `/login?reason=${reason}` : "/login";
  return NextResponse.redirect(`${origin}${target}`);
}

export async function POST(request: Request) {
  return GET(request);
}
