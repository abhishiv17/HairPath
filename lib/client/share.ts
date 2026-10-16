// The barber link: the client sends a read-only copy of their document; the barber opens it by link
// (no account) and answers each step. Replies reach the client live over Supabase Realtime.
import { useEffect, useRef, useState } from "react";
import { ROUTE_HEADLINES } from "@/lib/rules";
import { sharedPayloadOk, type Reply, type SharedPlan, type SharedRecord, type Verdict } from "@/lib/shared";
import { chairFor, CHEM, GROW, baselineText, type CardData } from "./card";
import { CloudError, ensureSession, supabase } from "./cloud";
import { makeThumb } from "./plans";

export const shareUrl = (id: string) => `${window.location.origin}/b/${id}`;

const small = async (src: string | null | undefined, w: number) => {
  if (!src) return null;
  try {
    return await makeThumb(src, w);
  } catch {
    return null;
  }
};

/** A read-only copy of the document for the barber: text plus small previews only. */
export async function buildSharedPlan(d: CardData): Promise<SharedPlan> {
  const photos: SharedPlan["photos"] = [];
  const add = async (label: string, src: string | null | undefined, w = 360) => {
    const s = await small(src, w);
    if (s) photos.push({ label, src: s });
  };
  await add("Now", d.sourceImage);
  const stages = d.stages.filter((s) => s.image);
  for (const [i, s] of stages.entries()) await add(stages.length > 1 ? `Stage ${i + 1}` : "Along the way", s.image);
  await add("Grown", d.growOutImage);
  await add("Destination", d.targetImage ?? d.sourceImage, 480);

  const keep = [GROW[d.prefs.growOut], CHEM[d.prefs.chemical]];
  if (d.prefs.keepLength) keep.unshift("Keep as much length as possible");
  if (d.prefs.nonNegotiables.trim()) keep.push(`Please don't: ${d.prefs.nonNegotiables.trim()}`);
  return {
    v: 1,
    targetName: d.target.name,
    routeHeadline: ROUTE_HEADLINES[d.route.route],
    explanation: d.route.explanation,
    baseline: baselineText(d.baseline).split(" (")[0],
    texture: d.texture?.term,
    density: d.hairCheck?.density?.term,
    frizz: d.hairCheck?.frizz?.term,
    photos,
    chair: chairFor(d).map(({ when, title, ask, details }) => ({ when, title, ask, details })),
    keep,
    cautions: d.route.cautions.slice(0, 3).map((c) => c.text),
    questions: d.questions,
    note: d.note.trim(),
    simulated: d.simulated || undefined,
  };
}

export async function createShare(plan: SharedPlan): Promise<string> {
  const owner = await ensureSession();
  const { data, error } = await supabase()!.from("shared_plans").insert({ owner, plan }).select("id").single();
  if (error || !data) throw new CloudError("Couldn't create the link. Check your connection and try again.");
  return data.id as string;
}

export async function updateShare(id: string, plan: SharedPlan): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  await sb.from("shared_plans").update({ plan, updated_at: new Date().toISOString() }).eq("id", id);
}

export async function stopShare(id: string): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { error } = await sb.from("shared_plans").delete().eq("id", id);
  if (error) throw new CloudError("Couldn't stop sharing. Check your connection and try again.");
}

export async function getShare(id: string): Promise<SharedRecord | null> {
  const sb = supabase();
  if (!sb) throw new CloudError("Sharing isn't set up in this version of HairPath.");
  const { data, error } = await sb.rpc("get_shared_plan", { p_id: id });
  if (error) throw new CloudError("Couldn't load the plan. Check your connection and try again.");
  if (!data || !sharedPayloadOk((data as SharedRecord).plan)) return null;
  return data as SharedRecord;
}

export async function markOpened(id: string): Promise<void> {
  await supabase()?.rpc("mark_plan_opened", { p_id: id });
}

export async function sendReply(id: string, r: { step: number | null; verdict: Verdict | null; note?: string; author?: string }): Promise<Reply> {
  const sb = supabase();
  if (!sb) throw new CloudError("Replies aren't set up in this version of HairPath.");
  const { data, error } = await sb.rpc("reply_to_plan", {
    p_id: id,
    p_step: r.step,
    p_verdict: r.verdict,
    p_note: r.note ?? null,
    p_author: r.author ?? null,
  });
  if (error) {
    throw new CloudError(
      error.message.includes("plan_not_found") ? "The client has stopped sharing this plan." : "Couldn't send that. Check your connection and try again.",
    );
  }
  return data as Reply;
}

/**
 * The barber's replies to a shared plan, live. Realtime delivers each one the moment it is sent;
 * a slow poll covers networks that block websockets. `onNew` fires for replies after the first load.
 */
export function useLiveReplies(id: string | null | undefined, onNew?: (r: Reply) => void) {
  const [replies, setReplies] = useState<Reply[] | null>(null);
  const [gone, setGone] = useState(false);
  const seen = useRef<Set<number> | null>(null);
  const cb = useRef(onNew);
  useEffect(() => {
    cb.current = onNew;
  });

  useEffect(() => {
    const sb = supabase();
    if (!id || !sb) return;
    let alive = true;
    seen.current = null;
    setReplies(null);
    setGone(false);

    const merge = (incoming: Reply[]) => {
      if (!alive) return;
      const first = seen.current === null;
      const known = (seen.current ??= new Set());
      const fresh = incoming.filter((r) => !known.has(r.id));
      if (!fresh.length && !first) return;
      fresh.forEach((r) => known.add(r.id));
      if (!first) fresh.forEach((r) => cb.current?.(r));
      setReplies((cur) => [...(first ? [] : cur ?? []), ...fresh].sort((a, b) => a.id - b.id));
    };
    const load = () =>
      getShare(id).then(
        (rec) => (rec ? merge(rec.replies) : alive && setGone(true)),
        () => {},
      );

    // The poll reads only the (small) replies the owner may see, not the plan with its previews.
    const poll = () =>
      sb
        .from("plan_replies")
        .select("id,created_at,step,verdict,note,author")
        .eq("plan_id", id)
        .order("id")
        .then(({ data }) => data && seen.current && merge(data as Reply[]));

    load();
    const channel = sb
      .channel(`plan-replies-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "plan_replies", filter: `plan_id=eq.${id}` }, (p) =>
        merge([p.new as Reply]),
      )
      .subscribe();
    const timer = setInterval(poll, 10_000);
    return () => {
      alive = false;
      clearInterval(timer);
      sb.removeChannel(channel);
    };
  }, [id]);

  return { replies, gone };
}
