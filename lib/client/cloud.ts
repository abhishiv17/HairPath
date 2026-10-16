// Optional cloud features on Supabase: the barber link, sync for signed-in users, and the community
// pulse. Nothing here is required: without the two NEXT_PUBLIC_SUPABASE_* variables every call is a
// no-op and HairPath stays a device-only app. Accounts are never needed to use the app.

import { useEffect, useState } from "react";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cloudConfigured, SUPABASE_KEY as KEY, SUPABASE_URL as URL_ } from "@/lib/cloudConfig";

export { cloudConfigured };

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!cloudConfigured || typeof window === "undefined") return null;
  // Magic links are opened from an email app, often in another browser: the implicit flow works there.
  client ??= createClient(URL_!, KEY!, { auth: { flowType: "implicit", persistSession: true, detectSessionInUrl: true } });
  return client;
}

/**
 * off:   no Supabase in this build
 * guest: no session yet (the default)
 * anon:  a silent guest session, made only to own a barber link
 * user:  signed in with email; plans and journeys sync
 */
export type Account =
  | { state: "off" }
  | { state: "loading" }
  | { state: "guest" }
  | { state: "anon"; userId: string }
  | { state: "user"; userId: string; email: string };

const toAccount = (u: User | null | undefined): Account =>
  !u ? { state: "guest" } : u.is_anonymous ? { state: "anon", userId: u.id } : { state: "user", userId: u.id, email: u.email ?? "" };

export async function currentAccount(): Promise<Account> {
  const sb = supabase();
  if (!sb) return { state: "off" };
  const { data } = await sb.auth.getSession();
  return toAccount(data.session?.user);
}

export function useAccount(): Account {
  const [acc, setAcc] = useState<Account>(cloudConfigured ? { state: "loading" } : { state: "off" });
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let alive = true;
    currentAccount().then((a) => alive && setAcc(a));
    const { data } = sb.auth.onAuthStateChange((_e, session) => alive && setAcc(toAccount(session?.user)));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return acc;
}

export class CloudError extends Error {}

/** A session to own shared things: the signed-in user, or a silent guest session made on first use. */
export async function ensureSession(): Promise<string> {
  const sb = supabase();
  if (!sb) throw new CloudError("Sharing isn't set up in this version of HairPath.");
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error || !anon.user) throw new CloudError("Couldn't start a sharing session. Check your connection and try again.");
  return anon.user.id;
}

export async function sendMagicLink(email: string): Promise<void> {
  const sb = supabase();
  if (!sb) throw new CloudError("Sign-in isn't set up in this version of HairPath.");
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/account` },
  });
  if (error) {
    throw new CloudError(
      error.status === 429 ? "Too many links sent. Wait a minute and try again." : "Couldn't send the link. Check the address and try again.",
    );
  }
}

export async function signOut(): Promise<void> {
  await supabase()?.auth.signOut();
}

/** Turns a Supabase/PostgREST error into a sentence for the UI. */
export function cloudMessage(e: unknown, fallback = "Something went wrong. Check your connection and try again."): string {
  return e instanceof CloudError ? e.message : fallback;
}
