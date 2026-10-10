// Shared IndexedDB opener for "My plans" and journeys. The app used to be called ManeRoute, and
// data saved back then sits in a database with the old name: it is copied over once, then removed.

const migrations = new Map<string, Promise<void>>();

function openRaw(name: string, store: string, create: boolean): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexeddb"));
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      if (create) req.result.createObjectStore(store, { keyPath: "id" });
      else req.transaction?.abort(); // no legacy database: don't leave an empty one behind
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => (create ? reject(req.error) : resolve(null));
  });
}

async function migrate(name: string, store: string, legacy: string): Promise<void> {
  const old = await openRaw(legacy, store, false);
  if (!old) return;
  if (!old.objectStoreNames.contains(store)) return old.close();
  const rows = await new Promise<unknown[]>((resolve, reject) => {
    const r = old.transaction(store, "readonly").objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  old.close();
  if (rows.length) {
    const db = (await openRaw(name, store, true))!;
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(store, "readwrite");
      for (const row of rows) t.objectStore(store).put(row);
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  }
  indexedDB.deleteDatabase(legacy);
}

/** Opens `name`, first moving any rows from `legacy` into it (once per page load, failing soft). */
export async function openDb(name: string, store: string, legacy: string): Promise<IDBDatabase> {
  let m = migrations.get(name);
  if (!m) migrations.set(name, (m = migrate(name, store, legacy).catch(() => {})));
  await m;
  return (await openRaw(name, store, true))!;
}
