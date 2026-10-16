// Sync merge rule for one kind of item (plans or journeys): last write wins, deletes are tombstones.
// Pure, so it is unit-tested and independent of IndexedDB and Supabase.

export type LocalItem = { id: string; updatedAt: number };
export type RemoteItem = { id: string; updated_at: number; deleted: boolean };

export function diffItems(local: LocalItem[], remote: RemoteItem[]) {
  const mine = new Map(local.map((l) => [l.id, l]));
  const theirs = new Set(remote.map((r) => r.id));
  const pull: string[] = [];
  const drop: string[] = [];
  const push: string[] = [];
  for (const r of remote) {
    const l = mine.get(r.id);
    if (r.deleted) {
      if (l && l.updatedAt <= r.updated_at) drop.push(r.id);
      else if (l) push.push(l.id); // edited here after the delete elsewhere: keep it
    } else if (!l || l.updatedAt < r.updated_at) pull.push(r.id);
    else if (l.updatedAt > r.updated_at) push.push(l.id);
  }
  for (const l of local) if (!theirs.has(l.id)) push.push(l.id);
  return { pull, drop, push };
}
