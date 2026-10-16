// Two-way sync between this device and the signed-in user's cloud copy.
// Last write wins per item (plans by updatedAt/createdAt, journeys by updatedAt); deletes travel as
// tombstones. Guests are never synced.
import { useEffect, useRef, useState } from "react";
import type { Journey } from "@/lib/journey";
import { diffItems } from "@/lib/merge";
import { supabase, useAccount } from "./cloud";
import { fetchItems, listItemMeta, upsertItems, type ItemMeta, type ItemRow } from "./cloudItems";
import { deleteJourneyLocal, listJourneys, putJourneyFromCloud } from "./journeys";
import { deletePlanLocal, listPlans, planUpdatedAt, putPlanFromCloud, toCloud, type CloudPlan } from "./plans";

export type SyncStatus = { state: "idle" | "syncing" | "synced" | "error"; at?: number; plans?: number; journeys?: number };

let status: SyncStatus = { state: "idle" };
const listeners = new Set<(s: SyncStatus) => void>();
const setStatus = (s: SyncStatus) => {
  status = s;
  listeners.forEach((l) => l(s));
};

let running: Promise<boolean> | null = null;

/** Syncs everything; resolves true when anything on this device changed. */
export function syncAll(): Promise<boolean> {
  running ??= run().finally(() => (running = null));
  return running;
}

async function run(): Promise<boolean> {
  let remote: ItemMeta[] | null;
  try {
    remote = await listItemMeta();
  } catch {
    setStatus({ ...status, state: "error" });
    return false;
  }
  if (!remote) return false;
  setStatus({ ...status, state: "syncing" });
  let changed = false;
  try {
    const plans = await listPlans();
    const p = diffItems(plans.map((x) => ({ id: x.id, updatedAt: planUpdatedAt(x) })), remote.filter((r) => r.kind === "plan"));
    for (const row of await fetchItems("plan", p.pull)) await putPlanFromCloud(row.data as CloudPlan);
    for (const id of p.drop) await deletePlanLocal(id);
    const pushPlans: ItemRow[] = [];
    for (const x of plans.filter((x) => p.push.includes(x.id))) {
      pushPlans.push({ kind: "plan", id: x.id, updated_at: planUpdatedAt(x), deleted: false, data: await toCloud(x) });
    }
    // One plan per request: each carries a document image.
    for (const row of pushPlans) await upsertItems([row]);

    const journeys = await listJourneys();
    const j = diffItems(journeys, remote.filter((r) => r.kind === "journey"));
    for (const row of await fetchItems("journey", j.pull)) await putJourneyFromCloud(row.data as Journey);
    for (const id of j.drop) await deleteJourneyLocal(id);
    for (const x of journeys.filter((x) => j.push.includes(x.id))) {
      await upsertItems([{ kind: "journey", id: x.id, updated_at: x.updatedAt, deleted: false, data: x }]);
    }

    changed = p.pull.length + p.drop.length + j.pull.length + j.drop.length > 0;

    // Barber links shared as a guest on this device move over to the account.
    const shareIds = (await listPlans()).map((x) => x.shareId).filter((x): x is string => Boolean(x));
    if (shareIds.length) await supabase()?.rpc("claim_shared_plans", { p_ids: shareIds });

    const alive = remote.filter((r) => !r.deleted);
    setStatus({
      state: "synced",
      at: Date.now(),
      plans: new Set([...alive.filter((r) => r.kind === "plan").map((r) => r.id), ...p.push]).size,
      journeys: new Set([...alive.filter((r) => r.kind === "journey").map((r) => r.id), ...j.push]).size,
    });
  } catch {
    setStatus({ ...status, state: "error" });
  }
  return changed;
}

export function useSyncStatus(): SyncStatus {
  const [s, set] = useState(status);
  useEffect(() => {
    listeners.add(set);
    return () => void listeners.delete(set);
  }, []);
  return s;
}

/** Syncs when a signed-in page opens (and right after signing in), then calls onChange if local data moved. */
export function useCloudSync(onChange: () => void) {
  const acc = useAccount();
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  const userId = acc.state === "user" ? acc.userId : null;
  useEffect(() => {
    if (!userId) return;
    syncAll().then((changed) => changed && cb.current());
  }, [userId]);
}
