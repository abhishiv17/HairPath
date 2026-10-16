// "My plans": consultation cards saved on this device (IndexedDB). For signed-in users each change
// is also mirrored to their cloud copy (see sync.ts); guests' plans never leave the device.
// Every call fails soft: in private windows or with storage blocked, saving is simply unavailable.

import { queueItem, removeItems } from "./cloudItems";
import { openDb } from "./idb";

export type SavedPlan = {
  id: string;
  createdAt: number;
  targetName: string;
  routeKind: string;
  routeHeadline: string;
  baselineLabel: string;
  textureLabel?: string;
  summary: string;
  card: Blob;
  thumb: string; // small data URL for the list
  /** Set when the plan was sent to a barber: the id of its shared link. */
  shareId?: string;
  /** Last change (sharing); plans made before this field existed use createdAt. */
  updatedAt?: number;
};

/** How a plan travels to the cloud: the document as a smaller JPEG instead of the PNG blob. */
export type CloudPlan = Omit<SavedPlan, "card"> & { card: string };

export const planUpdatedAt = (p: SavedPlan) => p.updatedAt ?? p.createdAt;

const DB = "hairpath";
const LEGACY_DB = "maneroute";
const STORE = "plans";

const open = () => openDb(DB, STORE, LEGACY_DB);

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}

const mirror = (plan: SavedPlan) => queueItem("plan", plan.id, async () => ({ updatedAt: planUpdatedAt(plan), data: await toCloud(plan) }), 300);

export async function savePlan(p: Omit<SavedPlan, "id" | "createdAt">): Promise<SavedPlan> {
  const plan: SavedPlan = { ...p, id: crypto.randomUUID(), createdAt: Date.now() };
  await tx("readwrite", (s) => s.put(plan));
  mirror(plan);
  return plan;
}

export async function updatePlan(id: string, patch: Partial<Pick<SavedPlan, "shareId">>): Promise<SavedPlan | null> {
  const cur = await tx<SavedPlan | undefined>("readonly", (s) => s.get(id) as IDBRequest<SavedPlan | undefined>);
  if (!cur) return null;
  const next: SavedPlan = { ...cur, ...patch, updatedAt: Date.now() };
  await tx("readwrite", (s) => s.put(next));
  mirror(next);
  return next;
}

/** Writes a plan that came from the cloud, without sending it back. */
export async function putPlanFromCloud(p: CloudPlan): Promise<void> {
  const card = await (await fetch(p.card)).blob();
  await tx("readwrite", (s) => s.put({ ...p, card }));
}

export async function deletePlanLocal(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
}

export async function toCloud(p: SavedPlan): Promise<CloudPlan> {
  return { ...p, card: await blobToJpeg(p.card, 760) };
}

async function blobToJpeg(blob: Blob, maxW: number): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w = Math.min(maxW, img.width);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = Math.round((img.height / img.width) * w);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function listPlans(): Promise<SavedPlan[]> {
  try {
    const all = await tx<SavedPlan[]>("readonly", (s) => s.getAll() as IDBRequest<SavedPlan[]>);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function deletePlan(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id));
  void removeItems("plan", [id]);
}

export async function deleteAllPlans(): Promise<void> {
  const ids = (await listPlans()).map((p) => p.id);
  await tx("readwrite", (s) => s.clear());
  void removeItems("plan", ids);
}

/** Small JPEG thumbnail for the plans list. */
export async function makeThumb(src: string, w = 160): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = w;
  c.height = Math.round((img.height / img.width) * w);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}
