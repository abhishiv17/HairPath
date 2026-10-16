"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Scene from "./Scene";
import { useAccount } from "@/lib/client/cloud";

// Site navigation, written in white over the painted landscape.
// `overlay`: sits on top of the landing hero. Otherwise it brings its own short painted band.
const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/consult", label: "Consult" },
  { href: "/journey", label: "My journey" },
  { href: "/plans", label: "My plans" },
];

/** Sign-in state at a glance. Signing in is optional; this is just the way in. */
function AccountChip() {
  const acc = useAccount();
  if (acc.state === "off" || acc.state === "loading") return null;
  const on = acc.state === "user";
  return (
    <Link href="/account" className={`nav-acct ${on ? "on" : ""}`} title={on ? `Signed in as ${acc.email}` : "Optional: sign in to sync"}>
      <span className="nav-acct-icon" aria-hidden>
        {on ? (
          (acc.email[0] ?? "✓").toUpperCase()
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="8.5" r="3.8" />
            <path d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4" />
          </svg>
        )}
      </span>
      <span>{on ? "Synced" : "Sign in"}</span>
    </Link>
  );
}

export default function SiteNav({
  current,
  right,
  overlay = false,
}: {
  current: "/" | "/consult" | "/journey" | "/plans" | "/account" | null;
  right?: React.ReactNode;
  overlay?: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open]);

  const bar = (
    <header className="nav">
      <Link href="/" className="nav-brand">
        HairPath
        <small>From the hair you have to the hair you want</small>
      </Link>
      <ul className="nav-index">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={current === i.href ? "page" : undefined}>{i.label}</Link>
          </li>
        ))}
      </ul>
      {right ?? (
        <Link href="/consult" className="nav-cta">Start</Link>
      )}
      <AccountChip />
      <button className="menu-btn" aria-expanded={open} aria-controls="route-menu" onClick={() => setOpen(true)}>
        <span className="menu-ico" aria-hidden><i /><i /><i /></span>
        Menu
      </button>
    </header>
  );

  return (
    <>
      {overlay ? (
        <div className="nav-overlay">{bar}</div>
      ) : (
        <div className="nav-band">
          <Scene focus="band" />
          {bar}
        </div>
      )}
      {open && (
        <div className="menu-sheet" id="route-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <Scene focus="road" />
          <div className="menu-inner">
            <div className="nav">
              <Link href="/" className="nav-brand" onClick={() => setOpen(false)}>HairPath</Link>
              <button className="menu-btn" onClick={() => setOpen(false)} autoFocus>Close</button>
            </div>
            <ol className="route-index">
              {ITEMS.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} onClick={() => setOpen(false)} aria-current={current === i.href ? "page" : undefined}>
                    {i.label}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
