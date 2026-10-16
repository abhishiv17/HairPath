# Supabase setup (optional cloud features)

HairPath runs fully without Supabase. Adding it turns on three things:

| Feature | What the user sees | Needs |
| --- | --- | --- |
| **Barber link** | "Create barber link" on the document: a link + QR code. The barber opens it on their phone (no account), taps **Can do / Let's talk / Not yet** on each step and can leave a note. The client sees "Your barber opened it" and every answer **live** | URL + publishable key, anonymous sign-ins on |
| **Sign-in + sync** (optional) | `/account`: email magic link. Plans and journeys sync between phone and laptop | URL + publishable key, redirect URLs |
| **Community pulse** | "Popular this week" row and "N tried this week" chips in the cut grid, and a live counter on the home page | Secret key on the server |

About 10 minutes, on the free plan.

## 1. Create the project
1. https://supabase.com → **New project**. Any name (e.g. `hairpath`), a strong database password, the region nearest you.
2. Wait for it to finish provisioning.

## 2. Run the migration
1. **SQL Editor** → **New query**.
2. Paste all of [`supabase/migrations/0001_hairpath_cloud.sql`](../supabase/migrations/0001_hairpath_cloud.sql) → **Run**. It is safe to run again.

This creates `items` (sync), `shared_plans` + `plan_replies` (barber link) and `style_tries` (pulse), with row-level security on every table, the functions the barber page uses, and adds `plan_replies` to Realtime.

## 3. Auth settings
**Authentication → Sign In / Providers**
- **Allow anonymous sign-ins: ON.** A guest who creates a barber link gets a silent guest session that owns it. Nobody has to sign up.
- **Email: ON** (default). "Confirm email" can stay on.

**Authentication → URL Configuration**
- **Site URL:** your deployed URL, e.g. `https://hairpath.vercel.app`
- **Redirect URLs:** add `http://localhost:3000/**` and `https://<your-vercel-domain>/**`

Optional: **Authentication → Emails → Magic Link**, change the subject to "Your HairPath sign-in link".

> The built-in email sender allows only a few emails per hour, which is enough for a demo. For more, add custom SMTP (Resend, Postmark…) under **Authentication → Emails → SMTP Settings**.

## 4. Keys
**Project Settings → API Keys**
- **Publishable key** (`sb_publishable_…`, or the legacy `anon` key): safe in the browser.
- **Secret key** (`sb_secret_…`, or the legacy `service_role` key): **server only**. Never put it in a `NEXT_PUBLIC_` variable.

**Project Settings → Data API**: copy the **Project URL**.

Add them to `.env.local` (and to Vercel → Project → Settings → Environment Variables):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

`NEXT_PUBLIC_*` values are baked in at build time: **redeploy** after adding them on Vercel. Restart `npm run dev` locally.

## 5. Check it works
1. Run a consultation to the document → **Create barber link**. A QR code appears with "Waiting for your barber to open it…".
2. Open the link on another phone, or in a private window (the client's own browser counts as a preview). The laptop shows **"Your barber opened it · just now"**.
3. Tap **Can do** on a step. The client's screen updates within a second, and Pip cheers.
4. `/account` → enter your email → open the link. The nav shows **Synced**. Sign in on a second device and your plans and journeys appear.
5. Try a few cuts in real mode (not mock): the cut grid starts showing "N tried this week". **Popular this week** appears once at least two cuts have try-ons this week.

## Security model (short)
- Every table has RLS. The publishable key can't list anyone's plans, replies or synced items.
- Barbers reach exactly one plan by its unguessable id, through `security definer` functions: `get_shared_plan`, `mark_plan_opened`, `reply_to_plan` (which checks lengths, caps replies at 300 per plan, and doesn't let anyone fake an "opened" event).
- Only permanent (email) accounts can sync. Guest sessions exist only to own barber links.
- Try-on counts are written only by HairPath's server with the secret key (`bump_style_try` is not executable by the browser), so the pulse can't be inflated from devtools. It stores cut id, day and count: no user, photo or IP.
- **Stop sharing** deletes the shared plan and its replies. **Delete my cloud copy** on `/account` removes synced items and barber links.

## Not done (good next steps)
- CAPTCHA on anonymous sign-ins (Supabase supports Turnstile and hCaptcha) for a large public launch.
- Push notifications for barber replies when the app is closed.
