// Community pulse: how many HairPath try-ons each cut had this week and overall. Counts only.
import { useEffect, useState } from "react";
import { supabase } from "./cloud";

export type Pulse = Map<string, { week: number; total: number }>;

let cache: { at: number; data: Pulse } | null = null;

export async function loadPulse(): Promise<Pulse | null> {
  if (cache && Date.now() - cache.at < 60_000) return cache.data;
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("style_pulse");
  if (error || !Array.isArray(data)) return null;
  const m: Pulse = new Map();
  for (const r of data as { style_id: string; week: number; total: number }[]) m.set(r.style_id, { week: r.week, total: r.total });
  cache = { at: Date.now(), data: m };
  return m;
}

export function usePulse(): Pulse | null {
  const [p, setP] = useState<Pulse | null>(cache?.data ?? null);
  useEffect(() => {
    let alive = true;
    loadPulse().then((d) => alive && d && setP(d));
    return () => {
      alive = false;
    };
  }, []);
  return p;
}

export const weekTotal = (p: Pulse | null) => (p ? [...p.values()].reduce((n, x) => n + x.week, 0) : 0);
