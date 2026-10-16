# Privacy and safety

Face and hair photos are sensitive, so HairPath is built to hold as little as possible.

## What happens to a photo

1. The photo is taken or picked in the browser and resized on the device.
2. It's sent once to HairPath's server (`/api/photo`), which checks the file header and forwards it to the YouCam File API. **It isn't written to disk, logged or kept in memory after the request.**
3. YouCam processes it for Hair Length Detection and Hairstyle VTO. **YouCam keeps uploaded and generated files for up to 30 days** ([policy](https://docs.perfectcorp.com/develop/file_retention_period)).
4. The results (length category and preview images) come back to the browser and live only in page memory.
5. **Delete session data** on the card screen clears the photo, previews, preferences and card from the device. Closing the tab does the same.

## Controls

| Requirement | How it's met |
| --- | --- |
| Keep API keys server-side | The key is read only in `lib/youcam/client.ts` (`server-only` import), and a build check confirms it isn't in `.next/static` |
| Don't commit secrets | `.env.local` is gitignored, and `.env.example` has placeholders only |
| Don't store images longer than needed | Full-size photos are never stored by HairPath. The optional cloud (below) holds only small previews, and only for users who share or sign in. The service worker never caches `/api/*` or images |
| Delete-session control | On the card screen |
| Accounts optional | Nothing requires a login. Signing in (email magic link) is only for syncing devices |
| No training use | HairPath doesn't train anything. The YouCam API terms govern YouCam's side |
| Explain the previews | The onboarding, route screen and card all say the previews are generated for this consultation and are planning references |
| No sensitive inferences | Only length category and the user's own preferences are used. No medical, race, ethnicity, gender-identity or age inference |
| Informed consent | A consent checkbox names YouCam and the 30-day retention before capture |
| Logging | The server logs only the YouCam error code, method and a redacted path, never headers, bodies or the key |
| Abuse | A per-IP limit on paid task starts |
| Security headers | `nosniff`, `Referrer-Policy: no-referrer`, and a `Permissions-Policy` limiting the camera to this origin; API responses are `no-store` |

## Known limits (honest list)

- YouCam, not HairPath, controls YouCam's retention. The public docs show no deletion endpoint, so HairPath can't erase files on YouCam's side before the 30 days are up.
- The rate limit lives in memory per server instance, so it's best effort on serverless platforms.
- The generated card is a normal image once shared. Users choose who receives it.

## Saved plans ("My plans")

Cards the user chooses to save are stored in the browser's IndexedDB on that device. For guests they are never uploaded. **My plans** has per-plan and delete-all controls. The texture-scan side photos follow the same lifecycle as the front photo: they go to YouCam once and live in page memory until the session is deleted.

## Optional cloud (Supabase)

Only active when the deployment sets the Supabase variables ([SUPABASE_SETUP.md](SUPABASE_SETUP.md)), and only for the features a user chooses:

| What | When it leaves the device | What is stored | How to remove it |
| --- | --- | --- | --- |
| **Barber link** | The user taps **Create barber link** | A read-only copy of the document: text, and the small previews (≤ 480 px) of now / along the way / grown / destination. Owned by a silent guest session, no email | **Stop sharing** (link stops working, replies deleted) |
| **Barber replies** | The barber taps an answer or sends a note | Verdict per step, the note, an optional name the barber typed | Deleted with the shared plan |
| **Sync** | The user signs in with an emailed link | Their plans (the document as a ≤ 760 px JPEG) and journeys (with their small check-in pictures), plus their email in Supabase Auth | **Delete my cloud copy** on `/account`; deleting a plan or journey also deletes its cloud copy |
| **Community pulse** | A real (not mock) try-on the user picked starts | Cut id, day and a count. No user, photo, IP or device | Not personal data |

## Pip, the guide

Pip's built-in help and tips run entirely in the browser. Whether tips can pop up, and which ones were already shown, are kept in this browser's storage.

**Ask Pip anything** appears only when the deployment sets `GROQ_API_KEY`. When the user sends a question, the server forwards to Groq: the question, the last few lines of the chat, the screen they are on and a few facts the screen knows (the cut's name, the length band, the route headline, counts). Never a photo, an email or a name. HairPath stores none of it; Groq handles it under its own terms. The panel says this under the question box, and each AI answer is labelled.

Every table has row-level security; a barber reaches one plan only through its unguessable link id. Full-size photos still go only to YouCam.
