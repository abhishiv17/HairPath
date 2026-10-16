// Pip, the guide: pages say which screen they are and what's going on; the floating guide
// (components/pip/PipGuide.tsx) listens and speaks up. A tiny store, so any page can report without
// passing props through the layout.
import { useEffect, useSyncExternalStore } from "react";
import type { PipFacts, PipScreen, PipSituation } from "@/lib/pip/guide";

type PipState = {
  screen: PipScreen | null;
  facts: PipFacts;
  situations: Record<string, PipSituation>;
  /** Sources asking Pip to step aside (e.g. the live camera). */
  hidden: Record<string, true>;
};

const EMPTY: PipState = { screen: null, facts: {}, situations: {}, hidden: {} };
let state = EMPTY;
const subs = new Set<() => void>();
const set = (fn: (s: PipState) => PipState) => {
  state = fn(state);
  subs.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

export const usePipState = () => useSyncExternalStore(subscribe, () => state, () => EMPTY);

/** The screen this page shows, with the facts Pip may mention. */
export function usePipScreen(screen: PipScreen, facts: PipFacts = {}) {
  const key = JSON.stringify(facts);
  useEffect(() => {
    set((s) => ({ ...s, screen, facts: JSON.parse(key) }));
  }, [screen, key]);
  useEffect(() => () => set((s) => ({ ...s, screen: null, facts: {} })), []);
}

/** Something going on that Pip can help with (an error, a slow render); null when all is well. */
export function usePipSituation(source: string, situation: PipSituation | null) {
  useEffect(() => {
    if (!situation) return;
    set((s) => ({ ...s, situations: { ...s.situations, [source]: situation } }));
    return () =>
      set((s) => {
        const { [source]: _, ...rest } = s.situations;
        return { ...s, situations: rest };
      });
  }, [source, situation]);
}

/** Hides Pip while this component is on screen. */
export function usePipHidden(source: string) {
  useEffect(() => {
    set((s) => ({ ...s, hidden: { ...s.hidden, [source]: true } }));
    return () =>
      set((s) => {
        const { [source]: _, ...rest } = s.hidden;
        return { ...s, hidden: rest };
      });
  }, [source]);
}

// ---------- preferences (per device; storage can be blocked, so every access is guarded) ----------
const NUDGES = "hairpath.pip.nudges";
const SEEN = "hairpath.pip.seen";

export function nudgesOn(): boolean {
  try {
    return localStorage.getItem(NUDGES) !== "off";
  } catch {
    return true;
  }
}

export function setNudgesOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(NUDGES);
    else localStorage.setItem(NUDGES, "off");
  } catch {}
}

const store = (ever: boolean) => (ever ? localStorage : sessionStorage);

export function nudgeSeen(id: string, ever = false): boolean {
  try {
    return (JSON.parse(store(ever).getItem(SEEN) || "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}

export function markNudgeSeen(id: string, ever = false) {
  try {
    const all = JSON.parse(store(ever).getItem(SEEN) || "[]") as string[];
    if (!all.includes(id)) store(ever).setItem(SEEN, JSON.stringify([...all, id].slice(-50)));
  } catch {}
}

// ---------- Ask Pip (optional, server-side Groq) ----------
let askAvailable: Promise<boolean> | null = null;

export function canAskPip(): Promise<boolean> {
  askAvailable ??= fetch("/api/pip")
    .then((r) => (r.ok ? r.json() : { ask: false }))
    .then((d) => Boolean(d.ask))
    .catch(() => {
      askAvailable = null;
      return false;
    });
  return askAvailable;
}

export type AskTurn = { role: "user" | "assistant"; content: string };

export async function askPip(question: string, context: { screen: PipScreen; facts: PipFacts }, history: AskTurn[]): Promise<string> {
  const res = await fetch("/api/pip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, context, history }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || typeof data.answer !== "string") throw new Error(data?.error?.message || "Pip couldn't answer just now. Try again in a moment.");
  return data.answer;
}
