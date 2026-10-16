"use client";

import { getStyle } from "@/lib/catalog";
import { usePulse, weekTotal } from "@/lib/client/pulse";

/** "● 128 try-ons this week · most tried: Textured crop", live from the community pulse. */
export default function LivePulse() {
  const pulse = usePulse();
  const week = weekTotal(pulse);
  if (!pulse || week < 1) return null;
  const top = [...pulse.entries()].sort((a, b) => b[1].week - a[1].week)[0];
  const name = top && getStyle(top[0])?.name;
  return (
    <p className="live-strip" role="status">
      <span className="bl-dot" aria-hidden />
      {week} {week === 1 ? "try-on" : "try-ons"} this week{name ? ` · most tried: ${name}` : ""}
    </p>
  );
}
