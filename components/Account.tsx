"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import SiteNav from "@/components/route/SiteNav";
import { cloudMessage, sendMagicLink, signOut, useAccount } from "@/lib/client/cloud";
import { deleteCloudCopy } from "@/lib/client/cloudItems";
import { syncAll, useSyncStatus } from "@/lib/client/sync";
import { usePipScreen } from "@/lib/client/pip";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ACCOUNT: optional. Everything works without it; signing in adds sync across devices.
export default function Account() {
  const acc = useAccount();
  usePipScreen("account", { signedIn: acc.state === "user" });
  const sync = useSyncStatus();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // A magic link that expired or was already used comes back with an error in the URL.
  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1));
    if (h.get("error")) {
      setNotice({ ok: false, text: h.get("error_code") === "otp_expired" ? "That sign-in link has expired or was already used. Send a new one." : "Sign-in didn't complete. Send a new link." });
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const userId = acc.state === "user" ? acc.userId : null;
  useEffect(() => {
    if (userId) syncAll();
  }, [userId]);

  const send = async () => {
    const e = email.trim();
    if (!EMAIL.test(e)) return setNotice({ ok: false, text: "That doesn't look like an email address." });
    setBusy(true);
    setNotice(null);
    try {
      await sendMagicLink(e);
      setSent(e);
    } catch (err) {
      setNotice({ ok: false, text: cloudMessage(err) });
    }
    setBusy(false);
  };
  const removeCloud = async () => {
    if (!confirm("Delete your cloud copy and any barber links? Plans and journeys on this device stay.")) return;
    setBusy(true);
    try {
      await deleteCloudCopy();
      await signOut();
      setNotice({ ok: true, text: "Your cloud copy is deleted and you're signed out. Everything on this device is still here." });
    } catch {
      setNotice({ ok: false, text: "Couldn't delete it. Check your connection and try again." });
    }
    setBusy(false);
  };

  return (
    <div className="flow">
      <SiteNav current="/account" />
      <main className="flow-main" style={{ paddingTop: 18 }}>
        <div className="kicker"><span>Account · optional</span></div>
        <h1 className="display h2 screen-title">{acc.state === "user" ? "You're signed in." : "Take your road anywhere."}</h1>

        {acc.state === "off" && (
          <p className="lead">Cloud features aren&apos;t set up in this version of HairPath. Everything works on this device.</p>
        )}

        {acc.state === "loading" && <p className="muted">Checking…</p>}

        {(acc.state === "guest" || acc.state === "anon") && (
          <>
            <p className="lead" style={{ margin: "0 0 14px" }}>
              You never need an account. Sign in only if you want your plans and journeys on your phone <i>and</i> your laptop.
            </p>
            <ul className="acct-list small">
              <li>Start a consultation on your phone, check in from your laptop.</li>
              <li>Your barber&apos;s answers follow you to every device.</li>
              <li>No password: we email you a link.</li>
            </ul>

            {sent ? (
              <div className="pip" style={{ marginTop: 20 }}>
                <Mascot mood="cheer" size={64} />
                <div className="pip-body">
                  <div className="pip-label">PIP</div>
                  <div className="pip-text">
                    Check <b>{sent}</b> for a link from HairPath and open it on this device. Then you&apos;re in, and everything here starts syncing.
                  </div>
                  <button className="textbtn" onClick={() => setSent(null)}>Use a different address</button>
                </div>
              </div>
            ) : (
              <div className="acct-card">
                <label htmlFor="acct-email" className="mono" style={{ display: "block", marginBottom: 6 }}>Email</label>
                <input
                  id="acct-email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button className="cta block" style={{ marginTop: 10 }} onClick={send} disabled={busy || !email.trim()}>
                  {busy ? "Sending…" : "Email me a sign-in link"}
                </button>
              </div>
            )}
            <p className="tiny muted" style={{ marginTop: 12 }}>
              When you sign in, your saved plans and journeys (with their small preview pictures) are copied to HairPath&apos;s cloud database so
              your other devices can load them. Full-size photos never are. You can delete the cloud copy at any time.
            </p>
          </>
        )}

        {acc.state === "user" && (
          <>
            <div className="acct-card">
              <div className="mono muted">Signed in as</div>
              <div className="acct-email">{acc.email}</div>
              <div className="acct-stats">
                <div><b>{sync.plans ?? "–"}</b><span className="small">plans synced</span></div>
                <div><b>{sync.journeys ?? "–"}</b><span className="small">journeys synced</span></div>
              </div>
              <p className="small muted" style={{ margin: 0 }} role="status">
                {sync.state === "syncing"
                  ? "Syncing…"
                  : sync.state === "error"
                    ? "Couldn't sync just now. It will try again next time."
                    : sync.at
                      ? `Up to date · ${new Date(sync.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                      : "Ready"}
              </p>
              <div className="btn-row" style={{ marginTop: 10 }}>
                <button className="textbtn" onClick={() => syncAll()} disabled={sync.state === "syncing"}>Sync now</button>
                <button className="textbtn" onClick={() => signOut()}>Sign out</button>
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <Link href="/journey" className="cta">My journey</Link>
              <Link href="/plans" className="cta ghost">My plans</Link>
            </div>
            <section style={{ marginTop: 28 }}>
              <div className="kicker"><span>Your data</span></div>
              <p className="small muted" style={{ margin: "6px 0" }}>
                Signing out keeps everything on this device. Deleting the cloud copy removes your synced plans, journeys and barber links from
                HairPath&apos;s database.
              </p>
              <button className="textbtn danger" onClick={removeCloud} disabled={busy}>Delete my cloud copy</button>
            </section>
          </>
        )}

        {notice && <p className={`note ${notice.ok ? "ok" : ""}`} role="status">{notice.text}</p>}
      </main>
    </div>
  );
}
