"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Mascot from "@/components/Mascot";
import SiteNav from "@/components/route/SiteNav";
import { cloudConfigured, cloudMessage } from "@/lib/client/cloud";
import { listPlans } from "@/lib/client/plans";
import { getShare, markOpened, sendReply } from "@/lib/client/share";
import { latestVerdicts, VERDICTS, type Reply, type SharedRecord, type Verdict } from "@/lib/shared";
import { ago } from "./BarberLink";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_KEY = "hairpath-barber-name";

// What the barber sees: the client's plan in chair language, with one tap per step to answer.
export default function BarberView({ id }: { id: string }) {
  const [rec, setRec] = useState<SharedRecord | null | "missing" | "error">(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [own, setOwn] = useState(false);
  const [busy, setBusy] = useState<number | "note" | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!cloudConfigured || !UUID.test(id)) return setRec("missing");
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {}
    let alive = true;
    (async () => {
      try {
        const r = await getShare(id);
        if (!alive) return;
        if (!r) return setRec("missing");
        setRec(r);
        setReplies(r.replies);
        // The client checking their own link doesn't count as the barber opening it.
        const mine = (await listPlans()).some((p) => p.shareId === id);
        if (!alive) return;
        setOwn(mine);
        const key = `hairpath-opened-${id}`;
        if (!mine && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          markOpened(id).catch(() => {});
        }
      } catch {
        if (alive) setRec("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (rec === null) return <div className="flow"><SiteNav current={null} /></div>;

  if (rec === "missing" || rec === "error") {
    return (
      <div className="flow">
        <SiteNav current={null} />
        <main className="flow-main" style={{ paddingTop: 18 }}>
          <div className="pip warn">
            <Mascot mood="oops" size={64} />
            <div className="pip-body">
              <div className="pip-label">PIP</div>
              <div className="pip-text">
                {rec === "missing"
                  ? "This plan isn't shared any more, or the link is incomplete. Ask your client to send it again."
                  : "Couldn't load the plan. Check your connection and refresh."}
              </div>
            </div>
          </div>
          <Link href="/" className="cta block">What is HairPath?</Link>
        </main>
      </div>
    );
  }

  const p = rec.plan;
  const answers = replies.filter((r) => r.verdict !== "opened");
  const verdicts = latestVerdicts(answers);
  const myNotes = answers.filter((r) => r.note);
  const answered = p.chair.filter((_, i) => verdicts.has(i)).length;

  const rememberName = (n: string) => {
    try {
      localStorage.setItem(NAME_KEY, n.trim());
    } catch {}
  };
  const answer = async (step: number, verdict: Verdict) => {
    setBusy(step);
    setNotice(null);
    try {
      const r = await sendReply(id, { step, verdict, author: name.trim() || undefined });
      setReplies((x) => [...x, r]);
    } catch (e) {
      setNotice({ ok: false, text: cloudMessage(e) });
    }
    setBusy(null);
  };
  const sendNote = async () => {
    if (!note.trim()) return;
    setBusy("note");
    setNotice(null);
    try {
      const r = await sendReply(id, { step: null, verdict: null, note: note.trim(), author: name.trim() || undefined });
      setReplies((x) => [...x, r]);
      rememberName(name);
      setNote("");
      setNotice({ ok: true, text: "Sent. Your client sees it now." });
    } catch (e) {
      setNotice({ ok: false, text: cloudMessage(e) });
    }
    setBusy(null);
  };

  return (
    <div className="flow">
      <SiteNav current={null} />
      <main className="flow-main" style={{ paddingTop: 18 }}>
        <div className="kicker"><span>For the barber</span><span>Sent {ago(rec.created_at)}</span></div>
        <h1 className="display h2 screen-title">Your client&apos;s plan</h1>

        {own && (
          <p className="note">This is your own link. It&apos;s what your barber sees, and your taps here count as their answers.</p>
        )}
        {p.simulated && <p className="note">Test mode: the previews in this plan are simulated.</p>}

        <article className="doc" aria-label="Consultation plan">
          <div className="doc-head"><span>HairPath / For the chair</span><span>{answered}/{p.chair.length} answered</span></div>
          <div className="doc-photos bv-photos">
            {p.photos.map((ph) => (
              <figure key={ph.label}><img src={ph.src} alt={ph.label} /><figcaption>{ph.label}</figcaption></figure>
            ))}
          </div>
          <div className="doc-grid">
            <div>
              <div className="doc-label">Now</div>
              <div className="doc-val">{p.baseline}</div>
              {p.texture && <div className="mono">{p.texture}</div>}
              {p.density && <div className="mono">Density · {p.density}</div>}
              {p.frizz && <div className="mono">Frizz · {p.frizz}</div>}
            </div>
            <div><div className="doc-label">Destination</div><div className="doc-val">{p.targetName}</div></div>
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="doc-label">Route</div>
              <div className="doc-val accent">{p.routeHeadline}</div>
              {p.explanation && <p className="small" style={{ margin: "6px 0 0" }}>{p.explanation}</p>}
            </div>
          </div>

          <div className="doc-sec">
            <div className="doc-label">They&apos;ll ask for · tap to answer</div>
            <ol className="doc-chair bv-chair">
              {p.chair.map((c, i) => {
                const v = verdicts.get(i)?.verdict as Verdict | undefined;
                return (
                  <li key={i}>
                    <span className="doc-chair-num">{i + 1}</span>
                    <span>
                      <span className="doc-chair-when">{c.when}</span>
                      <b className="doc-chair-title">{c.title}</b>
                      <span className="doc-chair-ask">“{c.ask}”</span>
                      {c.details.length > 0 && <span className="doc-chair-details">{c.details.join(" · ")}</span>}
                      <span className="bv-verdicts" role="group" aria-label={`Your answer for ${c.title}`}>
                        {(Object.keys(VERDICTS) as Verdict[]).map((k) => (
                          <button key={k} className={`bv-v ${k}`} aria-pressed={v === k} disabled={busy !== null} onClick={() => answer(i, k)}>
                            {VERDICTS[k].label}
                          </button>
                        ))}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {(p.keep.length > 0 || p.note) && (
            <div className="doc-sec">
              <div className="doc-label">What matters to them</div>
              <ul className="doc-list">{p.keep.map((k) => <li key={k}>{k}</li>)}{p.note && <li>{p.note}</li>}</ul>
            </div>
          )}
          {p.cautions.length > 0 && (
            <div className="doc-sec">
              <div className="doc-label">Let&apos;s talk about</div>
              <ul className="doc-list">{p.cautions.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {p.questions.length > 0 && (
            <div className="doc-sec">
              <div className="doc-label">Their questions</div>
              <ul className="doc-list">{p.questions.map((q) => <li key={q}>{q}</li>)}</ul>
            </div>
          )}
          <div className="doc-foot"><span>Previews: YouCam AI · references, not guarantees</span><span>PIP ●</span></div>
        </article>

        <section style={{ marginTop: 24 }}>
          <div className="kicker" style={{ borderBottom: "2px dashed var(--line)", paddingBottom: 6, marginBottom: 12 }}>
            <span>Note to your client</span>
          </div>
          <label htmlFor="bv-name" className="mono" style={{ display: "block", margin: "0 0 6px" }}>Your name or shop (optional)</label>
          <input id="bv-name" type="text" maxLength={60} value={name} placeholder="e.g. Sam at Northside Barbers" onChange={(e) => setName(e.target.value)} onBlur={() => rememberName(name)} />
          <label htmlFor="bv-note" className="mono" style={{ display: "block", margin: "14px 0 6px" }}>Message</label>
          <textarea id="bv-note" maxLength={500} value={note} placeholder="e.g. Book 45 minutes. Let the top grow 6 more weeks first." onChange={(e) => setNote(e.target.value)} />
          <button className="cta block" style={{ marginTop: 10 }} onClick={sendNote} disabled={!note.trim() || busy !== null}>
            {busy === "note" ? "Sending…" : "Send to client"}
          </button>
          {notice && <p className={`note ${notice.ok ? "ok" : ""}`} role="status">{notice.text}</p>}
          {myNotes.length > 0 && (
            <ul className="bl-notes">
              {myNotes.map((r) => (
                <li key={r.id}>
                  <q>{r.note}</q>
                  <span className="mono muted">{r.author || "You"} · {ago(r.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pip" style={{ marginTop: 28 }}>
          <Mascot mood="happy" size={56} />
          <div className="pip-body">
            <div className="pip-label">PIP</div>
            <div className="pip-text">
              Your client made this with HairPath: they tried cuts on their own photo, YouCam AI measured their length, and this is the route they
              chose. Your answers go straight to their phone.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
