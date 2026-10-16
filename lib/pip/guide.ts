// Pip as a guide: what Pip says on each screen, the quick help it offers, and when it speaks up
// on its own. Pure data and rules (no React, no storage), so it is unit-tested and also feeds the
// "Ask Pip" prompt on the server.
import type { MascotMood } from "@/components/Mascot";

export const PIP_SCREENS = [
  "home",
  "start",
  "pick",
  "tryon",
  "plan",
  "card",
  "journey-empty",
  "journey",
  "checkin",
  "plans",
  "account",
  "barber",
  "other",
] as const;
export type PipScreen = (typeof PIP_SCREENS)[number];

/** Strings and numbers the screen knows, used to make Pip's words specific. Never photos. */
export type PipFacts = {
  /** The cut in focus (selected, on the slider, or planned). */
  cut?: string;
  /** Current length in words, e.g. "Ear length". */
  length?: string;
  /** Route headline, e.g. "Grow it out first". */
  route?: string;
  tried?: number;
  journeyTo?: string;
  checkins?: number;
  signedIn?: boolean;
};

/** Things going on that Pip can help with, most urgent first. */
export const PIP_SITUATIONS = [
  "photo-error",
  "length-error",
  "render-error",
  "camera-off",
  "length-slow",
  "render-slow",
  "length-running",
  "render-running",
] as const;
export type PipSituation = (typeof PIP_SITUATIONS)[number];

export const topSituation = (all: Iterable<PipSituation>): PipSituation | null => {
  let best: PipSituation | null = null;
  for (const s of all) if (!best || PIP_SITUATIONS.indexOf(s) < PIP_SITUATIONS.indexOf(best)) best = s;
  return best;
};

export type PipHelp = { id: string; q: string; a: string };
export type PipGuide = { mood: MascotMood; hello: string; help: PipHelp[] };

export type PipNudge = {
  id: string;
  mood: MascotMood;
  text: string;
  /** Milliseconds before Pip speaks up. */
  wait: number;
  /** true: the wait restarts whenever the user does something (Pip only helps when they seem stuck). */
  idle: boolean;
  /** "ever": said once on this device (the welcome). Otherwise once per visit. */
  once?: "ever";
};

const lower = (s?: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

const ROUTES_EXPLAINED =
  "Ready for your next appointment: you already have the length, so you can ask for it now. Grow it out first: it needs more length, and the plan lists cuts that look good on the way. Cut it shorter: agree on the shape before anything is cut, maybe in stages. Check with your stylist first: part of the look can't be judged from a photo. Retake your photo: YouCam couldn't read your hair, so HairPath won't guess.";

const PHOTO_TIPS =
  "Face forward with your head level and look at the lens. Wear your hair down, not tied up, with no hat. Frame your head and shoulders, and face the light rather than a window behind you.";

const HELP: Record<PipScreen, PipHelp[]> = {
  home: [
    { id: "how", q: "How does HairPath work?", a: "Four stops. Take one photo, pick a cut, try it on your own face, then get the route: can you ask for it now, grow first, or cut first? You get a document for your barber, and you can start a journey to track the road." },
    { id: "account", q: "Do I need an account?", a: "No. Everything works without one. Signing in is optional and only syncs your plans and journeys between your devices." },
    { id: "photo", q: "What happens to my photo?", a: "It goes to YouCam (Perfect Corp.) for the hair analysis and the try-ons. HairPath never keeps your full-size photo, and your plans stay in this browser. YouCam keeps processed files for up to 30 days." },
    { id: "time", q: "How long does it take?", a: "About a minute to your first try-on. Each try-on takes YouCam 15 to 40 seconds." },
  ],
  start: [
    { id: "tips", q: "What makes a good photo?", a: PHOTO_TIPS },
    { id: "camera", q: "The camera won't open", a: "Your browser may have blocked it. Allow camera access from the icon in the address bar and try again, or tap Or upload a photo instead. Any recent, front-facing photo works." },
    { id: "consent", q: "Why do I have to tick the box?", a: "Your photo is sent to YouCam to measure your hair and make the try-ons, so I ask first. HairPath doesn't keep it, and YouCam keeps processed files for up to 30 days." },
    { id: "old", q: "Can I use an older photo?", a: "You can, but a recent one is better. HairPath measures your length from it, and your route starts from there." },
  ],
  pick: [
    { id: "which", q: "Which cut should I pick?", a: "Start with one you'd actually book. Ready now is the easy win, and Big change is fun to see. You can try as many as you like and compare them side by side." },
    { id: "groups", q: "What do Ready now and Big change mean?", a: "YouCam measures length in five bands: above ears, ear length, short, medium and long. Ready now is within reach today, Grow one stage needs one band more, and Big change is two or more away." },
    { id: "lists", q: "Why Men's and Women's lists?", a: "They're just two catalogues, the barbershop list and the salon list. Pick either, or All. Nothing is guessed from your photo." },
    { id: "popular", q: "What is Popular this week?", a: "Real counts of the cuts HairPath users tried on in the last seven days. Numbers only: no photos and no names." },
  ],
  tryon: [
    { id: "compare", q: "How do I compare looks?", a: "Every cut you try lands in your lookbook. Tap one to bring it back to the slider, and drag the slider to see before and after." },
    { id: "finish", q: "What is Finish the look?", a: "Add a beard, a fringe or a colour on top of the cut, each with what to ask for. If you keep it, it goes on your document too." },
    { id: "exact", q: "Will my hair really look like this?", a: "The preview is a reference, not a promise. YouCam paints the shape on your face, but the real result depends on your texture, density and the cut itself. The route tells you what's realistic." },
    { id: "off", q: "The result looks off", a: "Try a photo taken straight on with your hair off your face, or a cut closer to your current length. Some templates also change the colour, and the card says when they do." },
  ],
  plan: [
    { id: "routes", q: "What does my route mean?", a: ROUTES_EXPLAINED },
    { id: "check", q: "What is the hair check?", a: "Three hands-free photos with your head turned. YouCam reads your texture, frizz and density, and the route and your routine adjust to them. It's optional." },
    { id: "grow", q: "How long will it take to grow?", a: "I won't guess, because growth speed is different for everyone. Start a journey and check in every few weeks, and your pace comes from your own measurements." },
    { id: "prefs", q: "Why do you ask about chemicals and styling time?", a: "They go on your document, so your barber or stylist knows them before anything is cut. They also change the route and the questions to ask." },
  ],
  card: [
    { id: "barber", q: "How do I show this to my barber?", a: "Create barber link makes a link and a QR code. Your barber opens it on their phone with no app or account and answers each step. You can also share or download the document and show it in the chair." },
    { id: "journey", q: "What is a journey?", a: "Start my journey turns this plan into a road you track: check-in photos measured again by YouCam, a haircare routine for your hair, and trim reminders." },
    { id: "saved", q: "Where is this saved?", a: "Save it to My plans and it stays in this browser. If you sign in, which is optional, it syncs to your other devices." },
    { id: "edit", q: "Can I change the questions?", a: "Yes. Add your own questions and a note before you share. If you've sent a barber link, your edits reach their copy too." },
  ],
  "journey-empty": [
    { id: "start", q: "How do I start a journey?", a: "Do a consultation first. On your document, tap Start my journey and the road appears here." },
    { id: "what", q: "What does a journey do?", a: "It tracks the road to your cut: check-in photos measured by YouCam, a haircare routine for your hair, a daily checklist and trim reminders." },
  ],
  journey: [
    { id: "checkin", q: "How do check-ins work?", a: "Every few weeks, take one photo like the first. YouCam measures your length again and paints your destination on the new photo, next to day one." },
    { id: "stuck", q: "Why haven't I moved?", a: "Hair grows inside a band for a while before it reaches the next one, so the same band is normal. If you had a cut, log it and I'll move." },
    { id: "routine", q: "What is the routine?", a: "Six taps give you a daily, wash-day, weekly and monthly routine for your hair, with the reason behind every step. Products are named by type, never by brand." },
    { id: "remind", q: "Can I get reminders?", a: "Tap Add reminders to my calendar. It downloads a calendar file with your check-ins and trims." },
  ],
  checkin: [
    { id: "tips", q: "How should I take the photo?", a: "The same way as day one: face forward, facing the light, hair visible to its ends. Similar photos make a fair comparison." },
    { id: "stuck", q: "What if I'm in the same band?", a: "That's normal. Hair grows inside a band long before it crosses into the next one. Your destination is still painted on today's photo." },
  ],
  plans: [
    { id: "where", q: "Where are my plans kept?", a: "In this browser on this device. If you sign in, which is optional, they also sync to your other devices." },
    { id: "shared", q: "What is the Barber link tag?", a: "That plan was sent to your barber. Open it to see their answers live, or tap Stop sharing to delete the link." },
    { id: "delete", q: "How do I delete a plan?", a: "Open it and tap Delete, or use Delete all saved plans at the bottom. If you're signed in, the cloud copy goes too." },
  ],
  account: [
    { id: "why", q: "Why would I sign in?", a: "Only to sync your plans and journeys between devices, like your phone and laptop. Everything else works without an account." },
    { id: "link", q: "The sign-in email didn't arrive", a: "Check your spam folder and wait a minute. Then open the link on the same device, and try again if it has expired." },
    { id: "delete", q: "Can I remove my data?", a: "Yes. Delete my cloud copy removes what's synced. Your plans in this browser stay until you delete them." },
  ],
  barber: [
    { id: "how", q: "How do I answer?", a: "Tap Can do, Let's talk or Not yet on each step, or send a note. Your client sees each answer on their phone straight away." },
    { id: "account", q: "Do I need an account or app?", a: "No. This page is all you need, and it works only for as long as your client keeps sharing it." },
    { id: "previews", q: "What are the pictures?", a: "Try-on previews made by YouCam on your client's own photo: where they are now, along the way, and where they want to be. Treat them as a reference." },
  ],
  other: [],
};
HELP.other = HELP.home;

/** What Pip says and offers on a screen, given what's going on. */
export function guideFor(screen: PipScreen, f: PipFacts = {}, s: PipSituation | null = null): PipGuide {
  const help = HELP[screen];
  switch (screen) {
    case "home":
    case "other":
      return { mood: "wave", help, hello: "Hi, I'm Pip! I'll walk the road with you: try cuts on your own photo, see how far away they are, and take a plan to your barber." };
    case "start":
      if (s === "photo-error") return { mood: "oops", help, hello: "That photo didn't work out. Try a sharp, front-facing one with your hair visible, or use the camera instead." };
      if (s === "camera-off") return { mood: "oops", help, hello: "The camera isn't available here. No problem: upload a recent, front-facing photo instead." };
      return { mood: "wave", help, hello: "One photo is all I need. Tick the box, then Open camera: face forward, hair down, facing the light." };
    case "pick":
      if (s === "length-error") return { mood: "oops", help, hello: "YouCam couldn't read your length from this photo. Try again, or retake it with your hair visible down to its ends. You can still browse." };
      if (s === "length-slow") return { mood: "think", help, hello: "Measuring is taking longer than usual. Keep waiting, or pick a cut anyway: the route waits for the measurement." };
      if (s === "length-running" || !f.length)
        return { mood: "think", help, hello: "YouCam is measuring your length while you browse. Soon the cuts sort themselves into Ready now, Grow one stage and Big change." };
      return { mood: "happy", help, hello: `YouCam reads your hair as ${lower(f.length)}. Cuts under Ready now you could ask for today. The others need growing or a bigger change.` };
    case "tryon":
      if (s === "render-error") return { mood: "oops", help, hello: "That try-on didn't work. Retry it, or if the message asks, retake your photo." };
      if (s === "render-slow") return { mood: "think", help, hello: "This one is slow. YouCam is still working on it: keep waiting, or try another cut and come back." };
      if (s === "render-running")
        return { mood: "think", help, hello: `Painting ${f.cut ?? "the cut"} onto your photo. YouCam takes 15 to 40 seconds.` };
      return {
        mood: "happy",
        help,
        hello: `Drag the slider to compare ${f.cut ?? "the look"} with your hair now. Try a few, then tap Calculate my route on the one you like.`,
      };
    case "plan":
      return {
        mood: "think",
        help,
        hello: f.route
          ? `Your route${f.cut ? ` to ${f.cut}` : ""}: ${lower(f.route)}. Scroll down to see what to ask for at each visit, and why.`
          : "Here's the road from your hair now to the cut you chose, with what to ask for at each visit.",
      };
    case "card":
      return { mood: "cheer", help, hello: "Your document is ready! Send your barber a live link, save it to My plans, or start a journey to track the road." };
    case "journey-empty":
      return { mood: "wave", help, hello: "No journey yet. Do a consultation, then tap Start my journey on your document." };
    case "journey":
      return {
        mood: "walk",
        help,
        hello: `On the road${f.journeyTo ? ` to ${f.journeyTo}` : ""}. Check in every few weeks with one photo, and I move along when your length changes.`,
      };
    case "checkin":
      return { mood: "happy", help, hello: "Same as day one: face forward, facing the light, hair visible to its ends. Similar photos make a fair comparison." };
    case "plans":
      return { mood: "happy", help, hello: "Your saved plans, newest first. Open one to see it, and shared ones show your barber's answers." };
    case "account":
      return f.signedIn
        ? { mood: "cheer", help, hello: "You're synced. Your plans and journeys follow you to your other devices." }
        : { mood: "happy", help, hello: "Signing in is optional. Enter your email and I'll send you a link: no password needed." };
    case "barber":
      return { mood: "wave", help, hello: "Hi! Your client made this plan with HairPath. Answer each step, or leave a note, and they'll see it live." };
  }
}

const SITUATION_NUDGE: Partial<Record<PipSituation, Omit<PipNudge, "id" | "text">>> = {
  "photo-error": { mood: "oops", wait: 1200, idle: false },
  "camera-off": { mood: "oops", wait: 1200, idle: false },
  "length-error": { mood: "oops", wait: 1200, idle: false },
  "length-slow": { mood: "think", wait: 1200, idle: false },
  "render-error": { mood: "oops", wait: 1200, idle: false },
  "render-slow": { mood: "think", wait: 1200, idle: false },
  "render-running": { mood: "think", wait: 35_000, idle: false },
  "length-running": { mood: "think", wait: 40_000, idle: false },
};

const RUNNING_TEXT: Partial<Record<PipSituation, string>> = {
  "render-running": "Still painting. YouCam usually takes 15 to 40 seconds, so hang on a little longer.",
  "length-running": "Still measuring your length. You can keep browsing in the meantime.",
};

/** When the user has been still this long on a screen, Pip offers help (once per visit). */
const IDLE_NUDGE: Partial<Record<PipScreen, { wait: number; text: string; mood: MascotMood; when?: (f: PipFacts) => boolean }>> = {
  start: { wait: 35_000, mood: "wave", text: "Need a hand with the photo? Tap me for tips." },
  pick: { wait: 45_000, mood: "think", text: "Can't decide? Try one you'd actually book. You can try as many as you like.", when: (f) => !f.cut },
  plan: { wait: 50_000, mood: "think", text: "Not sure what your route means? Tap me and I'll explain." },
  card: { wait: 40_000, mood: "wave", text: "What next? Send your barber a live link, or start a journey to track the road." },
  "journey-empty": { wait: 25_000, mood: "wave", text: "Start with a consultation. Your journey begins from its document." },
  barber: { wait: 25_000, mood: "wave", text: "Tap Can do, Let's talk or Not yet on each step. Your client sees it straight away." },
};

/** The one thing Pip might say unprompted right now, or null. */
export function nudgeFor(screen: PipScreen, f: PipFacts = {}, s: PipSituation | null = null): PipNudge | null {
  if (s) {
    const n = SITUATION_NUDGE[s];
    if (n) return { ...n, id: `${screen}:${s}`, text: RUNNING_TEXT[s] ?? guideFor(screen, f, s).hello };
  }
  if (screen === "home") return { id: "welcome", mood: "wave", wait: 2500, idle: false, once: "ever", text: "Hi, I'm Pip, your guide. Tap me any time you need a hand." };
  const idle = IDLE_NUDGE[screen];
  if (idle && (!idle.when || idle.when(f))) return { id: `${screen}:idle`, mood: idle.mood, wait: idle.wait, idle: true, text: idle.text };
  return null;
}

/** Fallback when a page hasn't said which screen it is. */
export function screenFromPath(path: string | null): PipScreen {
  if (!path || path === "/") return "home";
  if (path.startsWith("/consult")) return "start";
  if (path.startsWith("/journey")) return "journey";
  if (path.startsWith("/plans")) return "plans";
  if (path.startsWith("/account")) return "account";
  if (path.startsWith("/b/")) return "barber";
  return "other";
}
