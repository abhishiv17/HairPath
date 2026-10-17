# What needs AbhiShiv

Claude can do everything in the codebase. The items below need your accounts, your face, your judgement, or an action nobody else can take.

## A. Decisions (please answer; Claude's recommendation is marked)

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | **Submission-window timing.** The rules require the project to be "newly created or significantly updated after" 29 Sep 2026, 12:00 pm ET. The MVP was built on 28 Sep. | (a) Keep building and log all significant work from 29 Sep in CHANGELOG. (b) Freeze and submit as is. | **(a).** Make the next big features (below) inside the window and document them. |
| D2 | ~~Next feature inside the window~~ | Done: Hair Type Detection, Hair Extension, the barber link and finish-the-look were all built inside the window | |
| D3 | ~~Audience focus~~ | Done: 58 cuts in user-chosen Men's / Women's / All lists | |
| D4 | ~~Repo visibility~~ | Done: public, MIT licence (`LICENSE`) | Make the GitHub repo public if it isn't yet |
| D5 | ~~Hosting~~ | Done: Vercel, https://hair-path-youcam.vercel.app | |
| D6 | **Special award** | Women in Tech · Rising Star/Student · none | Tick only what genuinely applies to you or your team |

## B. Manual tasks (only you can do these)

| # | Task | When | Notes |
| --- | --- | --- | --- |
| T1 | **Register** on the Devpost hackathon page | Now | https://youcam-api-skin-ai-ecommerce.devpost.com/ (opens 29 Sep, 12:00 pm ET) |
| T2 | **Check your YouCam unit balance** and claim hackathon credits if offered | Now | Console: https://yce.makeupar.com/api-console/en/api-keys/. Each full consultation costs 4–6 units, and testing on 28 Sep used roughly 20–25 |
| T3 | ~~Create a GitHub repo~~ Done: https://github.com/abhishiv17/HairPath. **Push the latest commits** (`git push origin main`) so Vercel redeploys them, and make the repo public | Now | Claude won't push until you say so. Never commit `.env.local` (it's already gitignored) |
| T4 | ~~Create a Vercel account and import the repo~~ | Done | Live at https://hair-path-youcam.vercel.app with the YouCam, Supabase and Groq keys set |
| T5 | **Test on your real phone** over https://hair-path-youcam.vercel.app | Now | The camera needs HTTPS. Run the checklist in [TESTING.md](TESTING.md) |
| T6 | **Interview 3–5 people** (and ideally 1–2 barbers or stylists) | This week | Use the assumptions table in [RESEARCH.md](RESEARCH.md) section 4. Paste notes into `docs/INTERVIEWS.md` and Claude will turn them into the "What we learned" section |
| T7 | **Record the demo video** | After T5 | Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md). Use your own face, or someone who agrees in writing. No copyrighted music |
| T8 | **Upload the video** publicly to YouTube or Vimeo | After T7 | Copy the link into SUBMISSION.md |
| T9 | **Take 5 phone screenshots** for Devpost | After T5 | Onboarding, camera, picker, route, card |
| T10 | **Fill the `‹…›` placeholders** (the video link and "What we learned") in [SUBMISSION.md](SUBMISSION.md) and the README, then submit on Devpost | Before 2 Nov 2026, 11:45 am ET | Aim to submit a few days early |
| T11 | **Keep the demo running** until judging ends, with enough units | Through judging | Consider raising `MAX_TASKS_PER_HOUR` or topping up units |
| T14 | **Try the texture scan yourself** on the camera: front, then turn right, then left (3-second timer, hands-free) | Now | The only path Claude could not verify with sample photos, because it needs real side angles of a person |
| T15 | **Run the hair check yourself once**: right, left, then head lowered about halfway | Now | Frizz and density were built from YouCam's API spec and their request shapes were confirmed, but they haven't had a successful call with real photos of a person. Check the route's "Why" lists your frizz and density |
| T12 | **Rotate your YouCam key** after the hackathon | After results | It's been used on your laptop and will be in Vercel |

## C. Things to be aware of

- **Your ISP blocks `cdn.perfectcorp.com`** (it resolves to an Airtel "restricted" page). The app no longer depends on it, but if you browse YouCam's docs and images look broken, that's why.
- **Template photos.** The style thumbnails in `public/styles/` come from YouCam's own template list. They're shown to pick a YouCam template, which is their intended use, but if you want zero doubt, ask the YouCam team (YouCamOnlineEditor_API@perfectcorp.com) or let Claude switch to illustrated icons.
