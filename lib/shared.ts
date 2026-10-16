// The barber link: what a client sends (a read-only copy of their consultation document) and what
// the barber can answer. Pure types and checks, shared by the client page and the barber page.

export type SharedPlan = {
  v: 1;
  targetName: string;
  routeHeadline: string;
  explanation: string;
  /** Current length, in words (from YouCam Hair Length Detection). */
  baseline: string;
  texture?: string;
  density?: string;
  frizz?: string;
  /** Small previews: now → along the way → grown → destination. */
  photos: { label: string; src: string }[];
  /** What to ask for, in order (the barber answers each step). */
  chair: { when: string; title: string; ask: string; details: string[] }[];
  keep: string[];
  cautions: string[];
  questions: string[];
  note: string;
  simulated?: boolean;
};

export type Verdict = "can_do" | "talk" | "not_today";

export type Reply = {
  id: number;
  created_at: string;
  /** Index into `chair`; null for a general note or the "opened" event. */
  step: number | null;
  verdict: Verdict | "opened" | null;
  note: string | null;
  author: string | null;
};

export type SharedRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  opened_at: string | null;
  views: number;
  plan: SharedPlan;
  replies: Reply[];
};

export const VERDICTS: Record<Verdict, { label: string; owner: string }> = {
  can_do: { label: "Can do", owner: "can do this" },
  talk: { label: "Let's talk", owner: "wants to talk about this" },
  not_today: { label: "Not yet", owner: "says not yet" },
};

const isStr = (x: unknown) => typeof x === "string";
const strs = (x: unknown) => Array.isArray(x) && x.every(isStr);

/** Guards the barber page against a malformed or foreign payload. */
export function sharedPayloadOk(p: unknown): p is SharedPlan {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    o.v === 1 &&
    isStr(o.targetName) &&
    isStr(o.routeHeadline) &&
    isStr(o.baseline) &&
    Array.isArray(o.photos) &&
    o.photos.every((x) => x && isStr((x as { src: unknown }).src) && isStr((x as { label: unknown }).label)) &&
    Array.isArray(o.chair) &&
    o.chair.every((c) => c && isStr((c as { title: unknown }).title) && isStr((c as { ask: unknown }).ask)) &&
    strs(o.keep) &&
    strs(o.cautions) &&
    strs(o.questions) &&
    isStr(o.note)
  );
}

/** The barber's latest answer per step (they can change their mind). */
export function latestVerdicts(replies: Reply[]): Map<number, Reply> {
  const m = new Map<number, Reply>();
  for (const r of replies) if (r.step !== null && r.verdict && r.verdict !== "opened") m.set(r.step, r);
  return m;
}
