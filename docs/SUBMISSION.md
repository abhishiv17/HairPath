# Devpost submission draft

Hackathon: **YouCam API Skin AI & eCommerce VTO Hackathon** ([overview](https://youcam-api-skin-ai-ecommerce.devpost.com/), [rules](https://youcam-api-skin-ai-ecommerce.devpost.com/rules)).
Submission window: 29 Sep 2026, 12:00 pm ET to **2 Nov 2026, 11:45 am ET**.

The text below is ready to paste into the Devpost fields. Replace every `‹…›` before submitting.

---

## Project name
HairPath

## Tagline (≤ 60 characters)
From the hair you have to the hair you want.

## Built with
Next.js, React, TypeScript, YouCam AI Hair Length Detection, YouCam AI Hair Type Detection, YouCam AI Hairstyle Virtual Try-On, YouCam AI Hair Extension, YouCam AI Beard Style Generator, YouCam AI Bangs, YouCam AI Hair Color, YouCam AI Hair Frizziness Detection, YouCam AI Hair Density Detection, YouCam File API, Supabase (Postgres, Auth, Realtime), Groq, IndexedDB, Web Share API, Canvas, PWA, Vercel

## Inspiration
Most bad haircuts aren't bad cutting. They're a bad conversation. People hand their barber or stylist an inspiration photo, but the photo can't say *"I'm not willing to grow it out"*, *"no perms"*, *"I need something I can style in five minutes"*, or *"my hair is nowhere near that long."* In a 2023 survey of 2,000 UK salon clients, 45% had been disappointed with an appointment outcome in the past year and a third felt their stylist didn't listen.

Try-on apps make this worse in a way: they show a perfect destination with no sense of how far away it is. We wanted to show the **route**.

## What it does
HairPath is a mobile-first web app (PWA) that turns a hairstyle goal into a route you can walk, sends it to your barber, and then walks it with you. Pip, a lion-cub mascot, guides you on every page.

**1. Consult (`/consult`)**
1. **Your photo.** A live camera with a framing guide, a 3-second timer and a lighting hint, or an upload.
2. **Your starting point, from YouCam AI Hair Length Detection.** It runs in the background while you browse. HairPath keeps YouCam's category, including "or longer" uncertainty, instead of inventing centimetres.
3. **58 cuts, tried on your own face with YouCam AI Hairstyle Virtual Try-On.** A photo grid in Men's, Women's or All lists, chosen by you and never guessed from your photo, sorted by your measured length into *Ready now*, *Grow one stage* and *Big change*. Each try-on wipes onto your face in a full-width before/after slider, and every look collects in a lookbook so you can compare three or four side by side. **Finish the look** on top of the cut with **YouCam AI Beard Style Generator** (15 beards, from clean-shaven to Garibaldi), **YouCam AI Bangs** (10 fringes per list) and **YouCam AI Hair Color** (9 colours), each with what to ask for in the chair.
4. **A route you can see.** Your own face at every stop on a painted road: now → along the way → your hair grown → the destination. A rule engine returns *Ready for your next appointment*, *Grow it out first*, *Cut it shorter* or *Check with your stylist first*, with every rule that fired shown by id and a plain sentence. No made-up percentages. It adds the cuts to ask for along the way and, from short hair up, **your own hair grown out** with YouCam AI Hair Extension. An optional **hair check** (three hands-free photos) runs **YouCam AI Hair Type Detection**, **Hair Frizziness Detection** and **Hair Density Detection**: the route flags, for example, that layered cuts thin out fine hair or that a sleek finish fights frizz, and the routine adds anti-frizz or volume steps.
5. **A document for the chair.** One page with your photo, the previews, the YouCam length result, **what to ask for in barber language** (for example "a grown-in wavy cut to the jaw: long layers, ends point-cut so the waves separate"), in order from the next appointment to the destination, your limits and questions for your stylist. Edit the questions, add a note, then share, download, copy or save it to **My plans**.

**2. Send it to your barber, live**
- **Create barber link** on the document makes a link and a QR code. The barber opens it on their phone with no app and no account, sees the plan in chair language with your previews, and taps **Can do**, **Let's talk** or **Not yet** on each step, or sends a note.
- On your screen, "Your barber opened it" and every answer appear as soon as they tap (Supabase Realtime), and Pip cheers. **Stop sharing** deletes the link and the replies.

**3. Walk the road (`/journey`)**
- **Start my journey** turns the document into a road whose stops carry the YouCam previews, with Pip standing where you are.
- **Check-ins:** every few weeks one new photo is measured again by Hair Length Detection, and Hairstyle Try-On **re-renders the destination on that photo**, next to the day-1 render, so progress is visible even before the length band changes. You move along the road when your length band changes or when you log the cut. Your pace comes from your own measurements and is never predicted.
- **A haircare routine** from six taps: daily, wash-day, weekly, monthly and this-stage steps, each with the rule (RT1–RT17) and reason behind it, and a checklist with a streak.
- **Trims and reminders:** log a cut and the next trim is planned; **Add reminders to my calendar** downloads an `.ics` file.

**4. My plans, account and community pulse**
- **My plans (`/plans`):** saved documents grouped by month, with the barber's live answers on shared plans.
- **Account (`/account`, optional):** never required. An emailed magic link syncs plans and journeys between phone and laptop.
- **Community pulse:** anonymous try-on counts per cut give **Popular this week** in the grid and a live counter on the home page.

**5. Pip, the guide.** A Pip button on every page opens help for the step you're on. Pip speaks up on its own only when you seem stuck (an error, a slow render, a long pause), and **Ask Pip anything** answers typed questions through Groq, text only, never photos.

By default everything stays in the browser: the session, plans, journeys and check-in photos. The cloud is opt-in per feature. A barber link uploads that document's text and small previews until you stop sharing, and signing in syncs plans and journeys until you delete the cloud copy. HairPath never stores a full-size photo and has no analytics.

## Consumer and retail value
- **Clients** know before the appointment whether their hair is ready, what to ask for on the way, and how to look after it while it grows.
- **Barbers and stylists** get the goal, the limits and the starting point before they pick up scissors, and can answer each step from their phone before the visit.
- **Salons and retailers** gain a consultation step to embed in booking or product pages, and a journey that brings the client back between appointments. The routine names product types, which is a natural place for grow-out and care products.

## How we built it
- **Next.js 16 + TypeScript.** Server route handlers hold the YouCam key, so it never reaches the browser. The YouCam side is stateless: nothing is written to disk.
- **YouCam File API → Hair Length Detection v1.0**, with a normalization layer that maps all 8 documented results to 5 bands plus an "or longer" flag.
- **YouCam Hairstyle VTO v2.1** with 58 cuts curated from YouCam's 116 templates, and `hair_color: "src"` where the template supports it so previews show shape rather than a colour change.
- **YouCam Beard Style Generator, Bangs and Hair Color**, chained on top of the haircut try-on; replacing one re-renders the stack from the cut.
- **YouCam Hair Extension VTO v1.0** for "your hair, grown", and **Hair Type, Frizziness and Density Detection** from three hands-free photos, which drive rules R6–R8 and routine steps RT16–RT17.
- **Refresh-safe polling.** Task ids are kept in the session, so a refresh resumes a YouCam task instead of paying for it again. Every YouCam engine error code maps to a plain-language fix.
- **Pure TypeScript rule engines** for the route (R0–R8, P1–P4) and the routine (RT1–RT17), barber scripts for all 58 cuts, a journey model for progress, pace and due dates, and an iCalendar builder.
- **On-device storage:** the session in sessionStorage; plans and journeys in IndexedDB; the document is drawn on a canvas.
- **Optional Supabase cloud:** row-level security on every table, `security definer` functions so a barber reaches exactly one plan by its unguessable id, silent guest sessions to own a barber link, Realtime for live answers with a polling fallback, and a last-write-wins merge with tombstones for sync. Try-on counts are written only by the server with the secret key.
- **Ask Pip** through Groq (`openai/gpt-oss-20b`), text only and rate-limited per IP.
- **Quality:** 64 unit tests, a Playwright browser walk-through with real YouCam calls, a three-device test (client phone, barber phone, laptop) for the barber link and sync, CI running typecheck, tests and build, and a PWA manifest.

## Challenges we ran into
- **Uncertain AI output.** YouCam sometimes says "short hair *or longer*". Treating that as "short" would send people down the wrong route, so those cases go to the stylist instead.
- **The "mullet" preview.** Hair Extension lengthens the cut you already have, so from very short hair it kept the short top and added long lengths underneath. "Your hair, grown" now appears only from short hair up, the route screen says why when it's skipped, and big gaps get two along-the-way cuts instead.
- **One photo, several APIs.** The browser prepares a single JPG that satisfies Hair Length Detection, Hairstyle VTO and Hair Extension, and the server checks the header before spending units.
- **Honest in-between previews and progress.** An along-the-way cut could read as a growth prediction, so it's labelled as a cut to ask for. Journey progress moves only on a measured band change or a logged cut, never on a timer.
- **A barber link without accounts.** The barber has no login and the client may be a guest, so the shared plan is reachable only through narrow database functions by its id, and a guest gets a silent session that owns the link and moves to their account if they sign in later.
- **Blocked CDN.** On one test network the template thumbnail CDN was blocked by the ISP, so the picker serves pictures locally.

## Accomplishments we're proud of
- Nine YouCam AI APIs, each with a job: where you are (length), what the target looks like on you (try-on), your own hair longer (extension), the whole barbershop look (beard, fringe, colour), and what your hair is like (texture, frizz, density). Try-On is used twice: to choose the destination, and again at every check-in to show it getting closer.
- The route is fully explainable: anyone can read *why* on one screen.
- The document is useful on its own. A stylist who has never seen the app understands it, and with the barber link they can answer it before the visit.
- It doesn't end at a try-on: the journey gives a reason to come back, measured by the same API.

## What we learned
‹Fill in with your own learnings, e.g. from user interviews in docs/INTERVIEWS.md›

## What's next
Beard routes (YouCam has no beard length measurement yet, so beards are a style choice today, not a tracked journey), a salon version that embeds the consultation in a booking page so the barber link arrives with the appointment, and CAPTCHA on guest sessions before a large public launch.

## YouCam APIs used (exact)
| API | Endpoint | Purpose |
| --- | --- | --- |
| File API | `POST /s2s/v2.0/file` | Register and upload the user photo |
| AI Hair Length Detection v1.0 | `POST/GET /s2s/v2.0/task/hair-length-detection` | Starting length, and every journey check-in |
| AI Hairstyle Virtual Try-On v2.1 | `POST/GET /s2s/v2.1/task/hair-transfer` | Target and along-the-way previews, and the destination re-rendered at every journey check-in |
| Hairstyle templates v2.1 | `GET /s2s/v2.1/task/template/hair-transfer` | Curating the 58-cut catalog |
| AI Hair Type Detection v1.0 | `POST/GET /s2s/v2.0/task/hair-type-detection` | Natural texture from a 3-angle scan; drives rule R6 and the routine |
| AI Hair Extension VTO v1.0 | `POST/GET /s2s/v2.0/task/hair-ext` | "Your hair, grown" preview on grow-out routes, from short hair up |
| AI Beard Style Generator | `POST/GET /s2s/v2.0/task/beard-style` (+ template list) | 15 beards on top of the haircut try-on |
| AI Bangs | `POST/GET /s2s/v2.0/task/hair-bang` (+ template list) | 20 fringes (10 Men's, 10 Women's) on top of the try-on |
| AI Hair Color | `POST/GET /s2s/v2.0/task/hair-color` | 9 colours on top of the try-on |
| AI Hair Frizziness Detection | `POST/GET /s2s/v2.0/task/hair-frizziness-detection` | Frizz grade from the hair-check photos; drives R8 and RT16 |
| AI Hair Density Detection | `POST/GET /s2s/v2.0/task/hair-density-detection` | Density grade from a head-lowered photo; drives R7 and RT17 |

## Work completed during the submission period
The initial MVP was created on 28 Sep 2026, before the window opened. Significant work since 29 Sep 2026, 12:00 pm ET (details in CHANGELOG.md):
- **29 Sep:** the MVP rebuilt after an honest product review (start → pick → try-on → route → document), refresh-safe sessions that resume YouCam tasks, the "mullet" grow-out fix with two-stage routes, Men's / Women's / All lists, and a full visual redesign.
- **30 Sep:** the "painted road" visual identity across every screen, the document and the shared image.
- **1 Oct:** **My journey**: check-ins measured by YouCam, a road with the previews, a routine engine (RT1–RT15) with a daily checklist and streaks, trim planning and calendar reminders. Pip redesigned as a full-body mascot.
- **2 Oct:** "finish the look" with beard, fringe and colour on top of the try-on (YouCam Beard Style Generator, Bangs, Hair Color), and a three-photo hair check adding YouCam Hair Frizziness and Hair Density Detection to the route and routine. Also a redesign around the try-on: a photo-grid catalog sorted into Ready now / Grow one stage / Big change, a full-width try-on with a wipe reveal and a lookbook, the route as a road with your face at every stop, barber-ready scripts for all 58 cuts on the route and the document, and the destination re-rendered at every journey check-in. Also: one plain name per route on every screen, an on-screen explanation when the grown-out preview is skipped, a service-worker fix for development, simulated try-ons clearly labelled, and a full live audit of every feature with real YouCam calls.
- **11 Oct:** renamed from ManeRoute to **HairPath** (and the mascot to Pip) everywhere, with saved plans and journeys migrated to the new names on first open.
- **16 Oct:** an optional cloud on Supabase: the **live barber link** with per-step answers and notes, optional magic-link **sign-in and sync** across devices, and the **community pulse**. **Pip became a guide** on every page, with help per step, nudges when someone seems stuck, and optional **Ask Pip** answers through Groq. A UI pass on the nav, buttons and sticky action bar across the app.

## Links
- Live demo: https://hair-path-youcam.vercel.app
- Repository: https://github.com/abhishiv17/HairPath (public, MIT licence)
- Demo video (public YouTube or Vimeo, 1–3 min): ‹https://…›

## Test instructions for judges
1. Open https://hair-path-youcam.vercel.app on a phone (or a laptop with a webcam). No login is needed.
2. Tap **Start your route**, tick consent, then use the camera or upload a front-facing photo with hair down and shoulders visible.
3. While your length is measured, pick a list and a cut, then tap **Try it on**. A try-on takes about 15–40 s.
4. Tap **Calculate my route**, set your limits, then **Build the document**. Try **Download**, **Copy** and **Save to My plans**.
5. Tap **Create barber link** and open the link or QR code on a second device. Answer a step there and watch it appear on the first.
6. Tap **Start my journey**, build the routine, tick a step, then **Check in** with another photo and **Add reminders to my calendar**.
7. Open **My plans** to reopen the saved document. The delete buttons on each page remove everything. Signing in on `/account` is optional and only adds sync.

A consultation uses about 4–9 YouCam units from our key (more with the hair check), and each check-in about 4.

---

## Submission checklist
- [x] Working app deployed and reachable without login until judging ends
- [ ] Repo URL with source, assets, README setup and test instructions (push the latest commits and make the repo public)
- [x] English description (above) with consumer and retail value
- [ ] 1–3 min public demo video, one continuous edit: capture → YouCam length → try-on → route → document → barber link → journey check-in, naming each YouCam API, recorded on a phone (see DEMO_SCRIPT.md)
- [ ] Screenshots (phone): camera, picker with length, try-on slider, route, document, barber link, journey
- [x] Exact YouCam APIs listed (above)
- [ ] No unlicensed music, logos or third-party photos in the video or repo
- [x] "Work completed during the submission period" filled in from CHANGELOG
- [ ] Special awards: tick Women in Tech or Rising Star/Student only if they apply to you
