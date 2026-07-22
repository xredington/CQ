import { createBrowserClient } from "@supabase/ssr";
import { createDemoClient, isDemoMode } from "@/lib/demo/mock";

/** Browser Supabase client (anon key only — never the service role). */
export function createClient() {
  if (isDemoMode()) {
    return createDemoClient(() => {
      const match = /(?:^|;\s*)demo_member=([^;]+)/.exec(document.cookie);
      return match ? decodeURIComponent(match[1]!) : null;
    });
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
