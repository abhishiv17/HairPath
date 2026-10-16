// "Ask Pip": the system prompt and the input checks for the optional AI answers (Groq).
// Pure, so it is unit-tested. Only text travels: the question, recent chat and the screen's facts.
import { guideFor, PIP_SCREENS, type PipFacts, type PipScreen } from "./guide.ts";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export const MAX_QUESTION = 400;
const MAX_TURN = 700;
const MAX_TURNS = 6;

const KNOWLEDGE = `HairPath is a mobile web app that plans a haircut from the hair someone has today to the hair they want.
Steps of a consultation (/consult): 1 You: one photo by camera or upload, after consent. 2 Pick: YouCam measures current length in the background while the user browses 58 cuts in Men's, Women's or All lists (nothing is guessed from the photo); cuts sort into Ready now, Grow one stage and Big change. 3 Try on: YouCam Hairstyle Try-On paints a cut on the user's own photo in a before/after slider; tried looks collect in a lookbook; Finish the look adds a beard, fringe or colour. 4 Route: a plain answer with reasons, cuts to ask for along the way, and a preview of the user's own hair grown out; an optional hair check (three hands-free photos) reads texture, frizz and density. 5 Document: what to ask for, in barber language, in order, plus questions and a note; it can be shared, downloaded, saved to My plans, sent as a live barber link, or turned into a journey.
Routes: "Ready for your next appointment" (has the length now), "Grow it out first" (needs more length; ask for shapes that look good while growing), "Cut it shorter" (agree on the shape first, maybe in stages), "Check with your stylist first" (part of the look can't be judged from a photo), "Retake your photo" (YouCam couldn't read the hair).
Length is measured in five YouCam bands: above ears, ear length, short, medium, long. HairPath never invents centimetres and never predicts how fast hair grows; a user's pace comes from their own check-ins.
Barber link: a link and QR code; the barber opens it with no app or account and taps Can do, Let's talk or Not yet on each step or sends a note; the client sees answers live; Stop sharing deletes it.
Journey (/journey): check-in photos every few weeks; YouCam measures the length again and re-renders the destination on the new photo; Pip moves when the band changes or a cut is logged; a haircare routine from six taps (daily, wash-day, weekly, monthly; product types, never brands); today's checklist; trim planning; calendar reminders.
My plans (/plans): saved documents in this browser. Account (/account): optional magic-link sign-in that only syncs plans and journeys between devices.
Privacy: photos go only to YouCam (Perfect Corp.) for analysis and try-ons; HairPath never keeps a full-size photo; YouCam keeps processed files up to 30 days; no analytics; the only count is anonymous try-ons per cut. Try-on previews are references, not guarantees.`;

/** The system prompt: who Pip is, what HairPath does, and where the user is right now. */
export function systemPrompt(screen: PipScreen, facts: PipFacts): string {
  const g = guideFor(screen, facts);
  const known = Object.entries(facts)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  return [
    "You are Pip, the guide in HairPath: a friendly lion-cub road-tripper. Help the user with HairPath and with their hair plan.",
    "Rules:",
    "- Answer in plain text, 2 to 4 short sentences, under 70 words. No markdown, no lists, no emoji.",
    "- Be warm and direct. Use the app's real button names when telling the user what to tap.",
    "- Only describe features listed below. If something isn't there, say so plainly.",
    "- You cannot see the user's photo or results beyond the facts given. Never pretend to.",
    "- Never guess anyone's gender, ethnicity, age or health. Don't give medical advice: for hair loss, scalp problems or sudden changes, suggest a doctor or dermatologist.",
    "- Never predict how fast hair grows or give centimetres or weeks.",
    "- General hair-care tips are fine (product types, never brands). For anything unrelated to hair or HairPath, kindly steer back.",
    "",
    "About HairPath:",
    KNOWLEDGE,
    "",
    `The user is on the "${screen}" screen. Pip's note for this screen: ${g.hello}`,
    known ? `What the app knows: ${known}.` : "The app has no measurements for this user yet.",
  ].join("\n");
}

export function cleanQuestion(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const q = v.replace(/\s+/g, " ").trim();
  return q && q.length <= MAX_QUESTION ? q : null;
}

/** The last few turns, trimmed; anything malformed is dropped. */
export function cleanHistory(v: unknown): ChatTurn[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is ChatTurn => Boolean(t) && (t.role === "user" || t.role === "assistant") && typeof t.content === "string" && t.content.trim() !== "")
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, content: t.content.trim().slice(0, MAX_TURN) }));
}

const FACT_TEXT = ["cut", "length", "route", "journeyTo"] as const;

/** The screen and facts as sent by the browser, checked: known screen, short strings, small numbers. */
export function cleanContext(v: unknown): { screen: PipScreen; facts: PipFacts } {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const screen = PIP_SCREENS.includes(o.screen as PipScreen) ? (o.screen as PipScreen) : "other";
  const raw = (o.facts && typeof o.facts === "object" ? o.facts : {}) as Record<string, unknown>;
  const facts: PipFacts = {};
  for (const k of FACT_TEXT) {
    const s = raw[k];
    if (typeof s === "string" && s.trim()) facts[k] = s.replace(/[\r\n]+/g, " ").trim().slice(0, 60);
  }
  for (const k of ["tried", "checkins"] as const) {
    const n = raw[k];
    if (typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 1000) facts[k] = n;
  }
  if (typeof raw.signedIn === "boolean") facts.signedIn = raw.signedIn;
  return { screen, facts };
}
