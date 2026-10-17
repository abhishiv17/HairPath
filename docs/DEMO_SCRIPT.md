# Demo video script (target 2:45, hard cap 3:00)

**Format:** one video with a voice-over, mostly a phone screen recording (cutting to the barber's screen for the barber-link scene is fine), uploaded publicly to YouTube or Vimeo. Not two separate clips.
**Rules:** 1–3 minutes, show the app running on its intended device (a phone), name the YouCam APIs, no copyrighted music or third-party logos. Judges don't have to watch past 3:00.

## Before recording
- Deploy and open the live URL on your phone (the camera needs HTTPS). Check `/api/health` says `"mock": false`. A yellow "Simulated" banner means mock mode: don't record.
- Supabase is set up on the deployment ([SUPABASE_SETUP.md](SUPABASE_SETUP.md)): the nav shows **Sign in**, and **Create barber link** appears on the document. Do one practice barber link and **Stop sharing** it afterwards.
- Use **your own photo**, or a friend's with written permission. No stock or celebrity photos.
- **Pick a pair that shows every preview.** "Your hair, grown" (Hair Extension) only appears when the current hair is **at least short** (YouCam reads "short hair" or longer) and the target is medium or long. From ear length or shorter the route shows a "Let it grow" stop that explains why instead. Good pairs:
  - short hair → **Long straight with fringe** (Women's list): Grow it out first, an along-the-way cut, your hair grown, the target.
  - ear-length hair → **Grown-out waves** (Men's list): Grow it out first, an along-the-way cut, and the "Let it grow" explanation.
- Do one full run before recording so the try-ons are fast and you know the timings. Clear the site data afterwards so the recording starts fresh.
- Do Not Disturb on, brightness up, notifications off.
- Music: none, or a track you have a licence for.

## Shot list (with the Supabase features)

**Setup for the two-screen moment:** record your phone (the client) and have a second phone or a laptop for "the barber". Easiest edit: a screen recording of each device, cut together, or film both devices with a third camera for the barber link scene. Before recording, run 5–10 real try-ons so the **Popular this week** row and the home-page counter have real numbers. Don't seed fake counts.

| Time | Screen | Voice-over (suggested) |
| --- | --- | --- |
| 0:00–0:10 | Home hero, the live counter "● N try-ons this week · most tried: …", scroll once | "An inspiration photo can't tell you if your hair is long enough, or what to ask for while it grows. HairPath plans the route." |
| 0:10–0:22 | **Start your route** → consent → camera with guide → capture | "One guided photo. No account, no sign-up." |
| 0:22–0:38 | Pick: length ticks to the YouCam result, grid sorts into Ready now / Grow one stage / Big change. Point at **Popular this week** and a "12 tried this week" chip | "**YouCam Hair Length Detection** measures where I'm starting. And I can see what other people are trying this week, live." |
| 0:38–0:58 | **Try it on**: the wipe, drag the slider, a "Try next" chip, the lookbook. **Finish the look**: a beard | "**Hairstyle Virtual Try-On** puts every cut on my own face. **Beard Style Generator**, Bangs and Hair Color finish the look." |
| 0:58–1:15 | **Calculate my route**: the road with my face at each stop, the headline, **What to ask for** | "My route as a road: the cut to ask for on the way, **Hair Extension** showing my own hair longer, and exactly what to say in the chair." |
| 1:15–1:22 | Optional hair check | "Three hands-free photos: YouCam reads texture, frizz and density." |
| 1:22–1:32 | **The document** → **Create barber link** → QR code appears, "Waiting for your barber…" | "Now the part no try-on app does. One tap makes a live link for my barber." |
| 1:32–1:55 | ⭐ **Barber's phone scans the QR** → the plan opens. **Client's phone instantly shows "Your barber opened it · just now"**. Barber taps **Can do** on step 1 → client's screen: the step turns green, Pip cheers "Your barber can do the …!". Barber types "Book 45 min, let the top grow 6 weeks" → it appears on the client's phone | "My barber opens it with no app and no account, and answers each step. I see every answer the second they tap." |
| 1:55–2:10 | **Start my journey**: the road with previews, routine, tick a step | "Then the plan becomes a journey, with a haircare routine built for my hair." |
| 2:10–2:25 | **Check in** with a new photo → destination re-rendered on today's photo | "Every few weeks, one photo. YouCam re-measures and re-renders my destination on today's hair." |
| 2:25–2:40 | Nav **Sign in** → email → open the link → **Synced**. Open the laptop: the same journey and plan with the barber's replies are there | "Accounts are optional. Sign in with one emailed link and the journey follows me to my laptop." |
| 2:40–2:50 | Title card: HairPath, the YouCam APIs, Supabase, the URL | "HairPath. Nine YouCam AI APIs, with live barber links and sync on Supabase." |

**Fallback if time is tight:** drop the hair check and the check-in; never drop the barber-link scene. It's the moment judges remember.

If anything fails during recording, cut it. Never show a feature as working when it didn't work.

## Title and description for YouTube
**Title:** HairPath: from the hair you have to the hair you want (YouCam API Hackathon)
**Description:** A 2-minute demo of HairPath, a mobile web app that plans the route from your hair today to the cut you want, and tracks the journey. Built with nine YouCam AI APIs: Hair Length Detection, Hairstyle Virtual Try-On, Hair Extension, Beard Style Generator, Bangs, Hair Color, Hair Type Detection, Hair Frizziness Detection and Hair Density Detection. Live barber links and sync run on Supabase. Try it: https://hair-path-youcam.vercel.app · Code: https://github.com/abhishiv17/HairPath
