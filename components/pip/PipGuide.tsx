"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Mascot from "@/components/Mascot";
import { guideFor, nudgeFor, screenFromPath, topSituation, type PipNudge } from "@/lib/pip/guide";
import { askPip, canAskPip, markNudgeSeen, nudgeSeen, nudgesOn, setNudgesOn, usePipState, type AskTurn } from "@/lib/client/pip";

// Pip, the guide, on every page: a tap away in the corner, with help for the screen you're on.
// Pip speaks up on its own only when you seem stuck (an error, a slow render, a long pause),
// once per situation, and can be told not to. "Ask Pip anything" appears when the server has a Groq key.

type Line = { from: "you" | "pip"; text: string; ai?: boolean; failed?: boolean };

const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

export default function PipGuide() {
  const pathname = usePathname();
  const pip = usePipState();
  const screen = pip.screen ?? screenFromPath(pathname);
  const situation = topSituation(Object.values(pip.situations));
  const guide = guideFor(screen, pip.facts, situation);
  const hidden = Object.keys(pip.hidden).length > 0;

  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [nudge, setNudge] = useState<PipNudge | null>(null);
  const [nudging, setNudging] = useState(true);
  const [ask, setAsk] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const fabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setNudging(nudgesOn()), []);

  // Float above a page's sticky action bar (.dock) instead of covering its buttons.
  const [lift, setLift] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = document.querySelector(".dock:not(.flat)")?.getBoundingClientRect();
        setLift(r && r.top < window.innerHeight && r.bottom > 0 ? Math.round(window.innerHeight - r.top) : 0);
      });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    const mo = new MutationObserver(measure);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      mo.disconnect();
    };
  }, []);

  // ---------- speaking up ----------
  const candidate = hidden ? null : nudgeFor(screen, pip.facts, situation);
  const candidateKey = candidate ? `${candidate.id}|${candidate.text}` : "";
  useEffect(() => {
    setNudge(null);
    if (!candidate || open || !nudging || nudgeSeen(candidate.id, candidate.once === "ever")) return;
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        markNudgeSeen(candidate.id, candidate.once === "ever");
        setNudge(candidate);
      }, candidate.wait);
    };
    arm();
    if (candidate.idle) for (const e of ACTIVITY) window.addEventListener(e, arm, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const e of ACTIVITY) window.removeEventListener(e, arm);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateKey, open, nudging]);

  // A tip fades away by itself after a while.
  useEffect(() => {
    if (!nudge) return;
    const t = window.setTimeout(() => setNudge(null), 16_000);
    return () => window.clearTimeout(t);
  }, [nudge]);

  // ---------- the panel ----------
  const show = () => {
    setNudge(null);
    setOpen(true);
    canAskPip().then(setAsk);
  };
  const close = () => {
    setOpen(false);
    fabRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [lines, busy]);

  const answer = (q: string, a: string) => setLines((l) => [...l, { from: "you", text: q }, { from: "pip", text: a }]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    if (!q || busy) return;
    setDraft("");
    const history: AskTurn[] = lines
      .filter((l) => !l.failed)
      .slice(-6)
      .map((l) => ({ role: l.from === "you" ? "user" : "assistant", content: l.text }));
    setLines((l) => [...l, { from: "you", text: q }]);
    setBusy(true);
    try {
      const a = await askPip(q, { screen, facts: pip.facts }, history);
      setLines((l) => [...l, { from: "pip", text: a, ai: true }]);
    } catch (err) {
      setLines((l) => [...l, { from: "pip", text: err instanceof Error ? err.message : "Pip couldn't answer just now.", failed: true }]);
    } finally {
      setBusy(false);
    }
  };

  const toggleNudges = (on: boolean) => {
    setNudging(on);
    setNudgesOn(on);
  };

  if (hidden) return null;

  const mood = busy ? "think" : nudge ? nudge.mood : guide.mood;

  return (
    <div className="pipg" style={{ "--pipg-lift": `${lift}px` } as React.CSSProperties}>
      {nudge && !open && (
        <div className="pipg-tip" role="status">
          <p>{nudge.text}</p>
          <div className="pipg-tip-row">
            <button className="pipg-tip-go" onClick={show}>Help me</button>
            <button className="pipg-x" aria-label="Dismiss Pip's tip" onClick={() => setNudge(null)}>×</button>
          </div>
        </div>
      )}

      {open && (
        <div className="pipg-panel" role="dialog" aria-label="Pip, your guide" ref={panelRef} tabIndex={-1}>
          <div className="pipg-head">
            <Mascot mood={mood} size={52} title="Pip" />
            <div className="pipg-who">
              <b className="display">Pip</b>
              <span>Your guide on the road</span>
            </div>
            <button className="pipg-x" aria-label="Close Pip" onClick={close}>×</button>
          </div>

          <div className="pipg-body" aria-live="polite">
            <p className="pipg-say">{guide.hello}</p>
            {lines.map((l, i) => (
              <div key={i} className={`pipg-line from-${l.from} ${l.failed ? "failed" : ""}`}>
                <p>{l.text}</p>
                {l.ai && <span className="pipg-ai">AI answer · check anything important with your stylist</span>}
              </div>
            ))}
            {busy && (
              <div className="pipg-line from-pip">
                <p className="pipg-dots" aria-label="Pip is thinking"><i /><i /><i /></p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {guide.help.length > 0 && (
            <div className="pipg-chips" aria-label="Quick help">
              {guide.help.map((h) => (
                <button key={h.id} onClick={() => answer(h.q, h.a)}>{h.q}</button>
              ))}
            </div>
          )}

          {ask && (
            <form className="pipg-ask" onSubmit={send}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={400}
                placeholder="Ask Pip anything about your hair plan"
                aria-label="Ask Pip a question"
              />
              <button type="submit" disabled={!draft.trim() || busy} aria-label="Send">→</button>
            </form>
          )}

          <div className="pipg-foot">
            <label className="check">
              <input type="checkbox" checked={nudging} onChange={(e) => toggleNudges(e.target.checked)} />
              <span>Pop up with tips when I seem stuck</span>
            </label>
            {ask && <p className="pipg-note">Questions you type go to Groq&apos;s AI to answer. Never your photo.</p>}
          </div>
        </div>
      )}

      <button
        ref={fabRef}
        className={`pipg-fab ${nudge ? "calling" : ""}`}
        aria-label={open ? "Close Pip" : "Ask Pip for help"}
        aria-expanded={open}
        onClick={() => (open ? close() : show())}
      >
        <Mascot mood={mood} size={46} title="Pip" />
        <span className="pipg-fab-label">{open ? "Close" : "Ask Pip"}</span>
      </button>
    </div>
  );
}
