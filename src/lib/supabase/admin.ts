import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createDemoClient, isDemoMode } from "@/lib/demo/mock";

if (typeof window !== "undefined") {
  throw new Error("supabase/admin must never be imported into client code");
}

/**
 * Service-role client. Server-only by import guard; bypasses RLS.
 * Use exclusively inside server actions that have already verified
 * the caller is an admin (see requireAdmin).
 */
export function createAdminClient() {
  if (isDemoMode()) return createDemoClient(() => null);
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
