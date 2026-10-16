// The signed-in user's cloud copy of plans and journeys (Supabase table `items`).
// Device storage stays the source of truth: these calls mirror it, fail soft, and do nothing for guests.
import { currentAccount, supabase } from "./cloud";

export type ItemKind = "plan" | "journey";
export type ItemMeta = { kind: ItemKind; id: string; updated_at: number; deleted: boolean };
export type ItemRow = ItemMeta & { data: unknown };

async function signedIn() {
  const a = await currentAccount();
  const sb = supabase();
  return a.state === "user" && sb ? { sb, userId: a.userId } : null;
}

export async function upsertItems(rows: ItemRow[]): Promise<void> {
  const s = await signedIn();
  if (!s || !rows.length) return;
  const { error } = await s.sb.from("items").upsert(
    rows.map((r) => ({ ...r, user_id: s.userId })),
    { onConflict: "user_id,kind,id" },
  );
  if (error) throw error;
}

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Mirrors one item a moment after its last change, so ticking five boxes sends one update. */
export function queueItem(kind: ItemKind, id: string, build: () => Promise<{ updatedAt: number; data: unknown }>, delay = 1500) {
  const key = `${kind}:${id}`;
  clearTimeout(timers.get(key));
  timers.set(
    key,
    setTimeout(async () => {
      timers.delete(key);
      try {
        if (!(await signedIn())) return;
        const { updatedAt, data } = await build();
        await upsertItems([{ kind, id, updated_at: updatedAt, deleted: false, data }]);
      } catch {
        // Offline or signed out: the next full sync catches up.
      }
    }, delay),
  );
}

/** Leaves a tombstone so the delete reaches the user's other devices. */
export async function removeItems(kind: ItemKind, ids: string[]): Promise<void> {
  for (const id of ids) clearTimeout(timers.get(`${kind}:${id}`));
  await upsertItems(ids.map((id) => ({ kind, id, updated_at: Date.now(), deleted: true, data: null }))).catch(() => {});
}

export async function listItemMeta(): Promise<ItemMeta[] | null> {
  const s = await signedIn();
  if (!s) return null;
  const { data, error } = await s.sb.from("items").select("kind,id,updated_at,deleted");
  if (error) throw error;
  return data as ItemMeta[];
}

export async function fetchItems(kind: ItemKind, ids: string[]): Promise<ItemRow[]> {
  const s = await signedIn();
  if (!s || !ids.length) return [];
  const { data, error } = await s.sb.from("items").select("kind,id,updated_at,deleted,data").eq("kind", kind).in("id", ids);
  if (error) throw error;
  return data as ItemRow[];
}

/** Removes everything this account keeps in the cloud. The copies on this device stay. */
export async function deleteCloudCopy(): Promise<void> {
  const s = await signedIn();
  if (!s) return;
  const a = await s.sb.from("items").delete().eq("user_id", s.userId);
  const b = await s.sb.from("shared_plans").delete().eq("owner", s.userId);
  if (a.error || b.error) throw a.error ?? b.error;
}
