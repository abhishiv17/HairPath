import "server-only";
import { after } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Community pulse: counts one try-on of a catalog cut (no photo, no user, no IP). Written only from
// here with the server's secret key, so counts can't be inflated from the browser. Off without a key.
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function recordTry(styleId: string): void {
  if (!URL_ || !SECRET) return;
  client ??= createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
  const sb = client;
  // After the response: a counting problem must never slow down or fail a try-on.
  after(async () => {
    try {
      const { error } = await sb.rpc("bump_style_try", { p_style: styleId });
      if (error) console.warn("[hairpath] pulse not recorded:", error.message);
    } catch {
      // Supabase unreachable: skip this count.
    }
  });
}
