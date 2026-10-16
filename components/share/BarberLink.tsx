"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import Mascot from "@/components/Mascot";
import { shareUrl, useLiveReplies } from "@/lib/client/share";
import { latestVerdicts, VERDICTS, type Reply, type Verdict } from "@/lib/shared";

export const ago = (iso: string, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86_400) return `${Math.round(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

/** Re-renders every 30 s so "2 min ago" stays true. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/**
 * The client's side of the barber link: QR code and link to hand over, then the barber's answers,
 * arriving live. `steps` names each step of the plan (what the barber is answering).
 */
export default function BarberLink({
  shareId,
  steps,
  onStop,
}: {
  shareId: string;
  steps: { title: string }[];
  onStop?: () => Promise<void> | void;
}) {
  const url = shareUrl(shareId);
  const [qr, setQr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [cheer, setCheer] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const now = useNow();

  const { replies, gone } = useLiveReplies(shareId, (r) => {
    setFresh((f) => new Set(f).add(r.id));
    setCheer(lineFor(r, steps));
    navigator.vibrate?.(60);
  });

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 420, errorCorrectionLevel: "M", color: { dark: "#1e2420", light: "#fff8ea" } }).then(setQr, () => setQr(null));
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link copied. Send it to your barber.");
    } catch {
      setNotice("Copying isn't available in this browser.");
    }
  };
  const share = async () => {
    try {
      if (navigator.share) return void (await navigator.share({ title: "My HairPath plan", text: "Here's the plan for my next cut:", url }));
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    copy();
  };
  const stop = async () => {
    if (!onStop || !confirm("Stop sharing? The link will stop working and your barber's answers are removed.")) return;
    setStopping(true);
    try {
      await onStop();
    } catch {
      setStopping(false);
      setNotice("Couldn't stop sharing. Check your connection and try again.");
    }
  };

  if (gone) {
    return (
      <section className="bl">
        <p className="small muted" style={{ margin: 0 }}>This barber link was stopped, so it no longer opens.</p>
      </section>
    );
  }

  const opens = (replies ?? []).filter((r) => r.verdict === "opened");
  const answers = (replies ?? []).filter((r) => r.verdict !== "opened");
  const verdicts = latestVerdicts(answers);
  const notes = answers.filter((r) => r.note);
  const lastOpen = opens[opens.length - 1];

  return (
    <section className="bl" aria-label="Barber link">
      <div className="bl-top">
        {qr ? <img className="bl-qr" src={qr} alt="QR code for the barber link" width={168} height={168} /> : <div className="bl-qr" aria-hidden />}
        <div className="bl-side">
          <div className="chapter-num" style={{ margin: 0 }}>Barber link · live</div>
          <p className="small" style={{ margin: "4px 0 10px" }}>
            Your barber scans this or opens the link, with no app or account, and answers each step. Their answers appear here as they tap.
          </p>
          <div className="bl-url mono">{url.replace(/^https?:\/\//, "")}</div>
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="textbtn" onClick={share}>Send link</button>
            <button className="textbtn" onClick={copy}>Copy</button>
            <a className="textbtn" href={url} target="_blank" rel="noreferrer">Preview</a>
          </div>
        </div>
      </div>

      <div className={`bl-status ${lastOpen ? "on" : ""}`} role="status" aria-live="polite">
        <span className="bl-dot" aria-hidden />
        {replies === null
          ? "Connecting…"
          : lastOpen
            ? `Your barber opened it · ${ago(lastOpen.created_at, now)}`
            : "Waiting for your barber to open it…"}
      </div>

      {cheer && (
        <div className="pip bl-cheer">
          <Mascot mood="cheer" size={52} />
          <div className="pip-body">
            <div className="pip-label">PIP</div>
            <div className="pip-text">{cheer}</div>
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <ol className="bl-steps">
          {steps.map((s, i) => {
            const r = verdicts.get(i);
            return (
              <li key={i} className={r && fresh.has(r.id) ? "fresh" : ""}>
                <span className="bl-num">{i + 1}</span>
                <span className="bl-title">{s.title}</span>
                {r?.verdict ? (
                  <span className={`bl-verdict ${r.verdict}`}>{VERDICTS[r.verdict as Verdict].label}</span>
                ) : (
                  <span className="bl-verdict none">No answer yet</span>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {notes.length > 0 && (
        <ul className="bl-notes">
          {notes.map((r) => (
            <li key={r.id} className={fresh.has(r.id) ? "fresh" : ""}>
              <q>{r.note}</q>
              <span className="mono muted">
                {r.author || "Your barber"}
                {r.step !== null && steps[r.step] ? ` · on ${steps[r.step].title}` : ""} · {ago(r.created_at, now)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {notice && <p className="note ok" role="status">{notice}</p>}
      {onStop && (
        <button className="textbtn danger" onClick={stop} disabled={stopping} style={{ marginTop: 6 }}>
          {stopping ? "Stopping…" : "Stop sharing"}
        </button>
      )}
    </section>
  );
}

function lineFor(r: Reply, steps: { title: string }[]): string | null {
  if (r.verdict === "opened") return "Your barber just opened your plan!";
  const step = r.step !== null ? steps[r.step]?.title : undefined;
  if (r.verdict && step) {
    if (r.verdict === "can_do") return `Your barber can do the ${step}!`;
    if (r.verdict === "talk") return `Your barber wants a word about the ${step}.`;
    return `Your barber says the ${step} isn't for today, but maybe later.`;
  }
  if (r.note) return `${r.author || "Your barber"} left you a note.`;
  return null;
}
