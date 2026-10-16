// End-to-end check of the optional Supabase features, with three browsers at once:
//   the client's phone, the barber's phone, and the client's laptop.
// Run the app in mock mode against a Supabase project (local `supabase start` works):
//   YOUCAM_MOCK=1 NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=… npm run dev
//   BASE_URL=http://localhost:3000 MAILPIT_URL=http://127.0.0.1:54324 npm run e2e:cloud
// Checks: barber link + QR → barber opens it (client sees "opened" live) → barber answers a step and
// sends a note (client sees both live) → My plans keeps the answers → magic-link sign-in → the laptop
// signs in and gets the plan and the journey. The sign-in steps need MAILPIT_URL (local Supabase's mail
// catcher) and are skipped without it. Screenshots land in tests/e2e/shots/ (gitignored).
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const MAILPIT = process.env.MAILPIT_URL;
const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));
const OUT = fileURLToPath(new URL("./shots/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const browserPath = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => p && existsSync(p));
if (!browserPath) throw new Error("No Chrome/Edge found. Set CHROME_PATH.");

const browser = await chromium.launch({ executablePath: browserPath });
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const errors = [];
const open = async (name, opts) => {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${name}] ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`[${name}] ${m.text()}`));
  return page;
};
let n = 0;
const shot = (page, name) => page.screenshot({ path: `${OUT}cloud-${String(++n).padStart(2, "0")}-${name}.png`, fullPage: true });
const step = (msg) => console.log(`· ${msg}`);
const expect = (cond, msg) => {
  if (!cond) {
    errors.push(`EXPECTATION FAILED: ${msg}`);
    console.error(`✗ ${msg}`);
  }
};

const client = await open("client", phone);
const barber = await open("barber", phone);

step("client: consultation to the document (mock YouCam)");
await client.goto(BASE, { waitUntil: "networkidle" });
await shot(client, "landing");
await client.goto(`${BASE}/consult`, { waitUntil: "networkidle" });
await client.getByRole("checkbox").check();
await client.locator("input[type=file]").setInputFiles(`${FIX}front.jpg`);
await client.getByRole("button", { name: "Use this photo" }).click();
await client.getByRole("tab", { name: /^Men's/ }).click();
await client.waitForSelector(".tree-row.done", { timeout: 90000 });
await client.waitForTimeout(800);
await shot(client, "pick");
await client.getByRole("button", { name: /^Grown-out waves\./ }).click();
await client.getByRole("button", { name: "Try it on" }).click();
// Works with real or mock try-ons (a mock try-on has no image, so no slider): wait until the route can be calculated.
await client.locator("button:has-text('Calculate my route'):not([disabled]):visible").first().waitFor({ timeout: 180000 });
await client.locator("button:has-text('Calculate my route'):not([disabled]):visible").first().click();
await client.getByText("What matters to you.").waitFor();
await client.waitForFunction(() => !/Rendering…|Measuring your starting point/i.test(document.body.innerText), null, { timeout: 120000 });
await client.getByRole("button", { name: "Build the document" }).click();
await client.waitForSelector(".doc", { timeout: 30000 });

step("client: create the barber link");
const create = client.getByRole("button", { name: "Create barber link" });
await create.waitFor({ timeout: 20000 });
await create.click();
await client.locator(".bl-qr[src^='data:image']").waitFor({ timeout: 20000 });
await client.getByText("Waiting for your barber to open it").waitFor({ timeout: 15000 });
const link = (await client.locator(".bl-url").innerText()).trim();
const url = /^https?:/.test(link) ? link : `${BASE.split("://")[0]}://${link}`;
expect(/\/b\/[0-9a-f-]{36}$/.test(url), `barber link looks right (${url})`);
await client.locator(".bl").scrollIntoViewIfNeeded();
await shot(client, "link-created");

step("barber: opens the link → client sees it live");
await barber.goto(url, { waitUntil: "networkidle" });
await barber.getByText("Your client's plan").waitFor({ timeout: 20000 });
await shot(barber, "barber-view");
await client.getByText(/Your barber opened it/).waitFor({ timeout: 15000 });
await client.getByText("Your barber just opened your plan!").waitFor({ timeout: 5000 });

step("barber: answers step 1 and sends a note → client sees both live");
const t0 = Date.now();
await barber.locator(".bv-chair li").first().getByRole("button", { name: "Can do" }).click();
await client.locator(".bl-steps li").first().locator(".bl-verdict.can_do").waitFor({ timeout: 15000 });
console.log(`  answer reached the client in ${Date.now() - t0} ms`);
await client.getByText(/Your barber can do the/).waitFor({ timeout: 5000 });
expect(await barber.locator(".bv-chair li").first().getByRole("button", { name: "Can do" }).getAttribute("aria-pressed") === "true", "barber's answer shows as chosen");
await barber.locator("#bv-name").fill("Sam at Northside");
await barber.locator("#bv-note").fill("Book 45 minutes. Let the top grow six more weeks first.");
await barber.getByRole("button", { name: "Send to client" }).click();
await barber.getByText("Sent. Your client sees it now.").waitFor();
await client.getByText("Book 45 minutes. Let the top grow six more weeks first.").waitFor({ timeout: 15000 });
await client.getByText(/Sam at Northside/).first().waitFor();
await shot(barber, "barber-answered");
await client.locator(".bl").scrollIntoViewIfNeeded();
await shot(client, "client-live-answers");

step("client: start the journey, then My plans keeps the barber's answers");
await client.getByRole("button", { name: "Start my journey" }).click();
await client.waitForURL("**/journey**", { timeout: 30000 });
await client.goto(`${BASE}/plans`, { waitUntil: "networkidle" });
await client.getByText("Barber link", { exact: false }).first().waitFor({ timeout: 10000 });
await client.locator(".archive-row").first().click();
await client.locator(".bl-steps li").first().locator(".bl-verdict.can_do").waitFor({ timeout: 15000 });
await client.getByText("Book 45 minutes. Let the top grow six more weeks first.").waitFor();
await shot(client, "plans-with-answers");

if (MAILPIT) {
  const email = `pip${Date.now()}@example.com`;
  const magicLink = async (to) => {
    for (let i = 0; i < 30; i++) {
      const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`)).json();
      const id = list.messages?.[0]?.ID;
      if (id) {
        const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
        const href = /href="([^"]+)"/.exec(msg.HTML)?.[1];
        if (href) return href.replace(/&amp;/g, "&");
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(`no magic link for ${to}`);
  };

  step("client: sign in with a magic link → synced");
  await client.goto(`${BASE}/account`, { waitUntil: "networkidle" });
  await client.locator("#acct-email").fill(email);
  await client.getByRole("button", { name: "Email me a sign-in link" }).click();
  await client.getByText(/Check .* for a link/).waitFor();
  await client.goto(await magicLink(email));
  await client.getByText("You're signed in.").waitFor({ timeout: 20000 });
  await client.getByText(/Up to date/).waitFor({ timeout: 30000 });
  await client.locator(".nav-acct.on").waitFor();
  await shot(client, "signed-in");

  step("laptop: signs in with the same email → plan and journey arrive");
  const laptop = await open("laptop", { viewport: { width: 1366, height: 800 } });
  await laptop.goto(`${BASE}/account`, { waitUntil: "networkidle" });
  await laptop.locator("#acct-email").fill(email);
  await laptop.getByRole("button", { name: "Email me a sign-in link" }).click();
  await laptop.getByText(/Check .* for a link/).waitFor();
  await new Promise((r) => setTimeout(r, 1500));
  // The first message is the client's; wait for the second one.
  let href = null;
  for (let i = 0; i < 30 && !href; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    if ((list.messages?.length ?? 0) >= 2) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0].ID}`)).json();
      href = /href="([^"]+)"/.exec(msg.HTML)?.[1]?.replace(/&amp;/g, "&");
    } else await new Promise((r) => setTimeout(r, 1000));
  }
  await laptop.goto(href);
  await laptop.getByText("You're signed in.").waitFor({ timeout: 20000 });
  await laptop.getByText(/Up to date/).waitFor({ timeout: 30000 });
  await laptop.goto(`${BASE}/journey`, { waitUntil: "networkidle" });
  await laptop.getByText("Grown-out waves").first().waitFor({ timeout: 20000 });
  await shot(laptop, "laptop-journey");
  await laptop.goto(`${BASE}/plans`, { waitUntil: "networkidle" });
  await laptop.locator(".archive-row").first().click({ timeout: 20000 });
  await laptop.getByText("Book 45 minutes. Let the top grow six more weeks first.").waitFor({ timeout: 15000 });
  await shot(laptop, "laptop-plan-with-answers");

  step("laptop: a new barber answer reaches the signed-in laptop live");
  await barber.locator(".bv-chair li").nth(1).getByRole("button", { name: "Let's talk" }).click();
  await laptop.locator(".bl-steps li").nth(1).locator(".bl-verdict.talk").waitFor({ timeout: 15000 });
} else {
  console.log("· sign-in and sync skipped (set MAILPIT_URL to run them)");
}

await browser.close();
if (errors.length) {
  console.error("Problems:\n" + errors.join("\n"));
  process.exit(1);
}
console.log("✓ cloud flow passed. Screenshots in tests/e2e/shots/");
