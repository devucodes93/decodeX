import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatClock, splitCountdown, useNow } from "../hooks";
import { playGo, playTick } from "../sound";
import * as api from "../api";

/*
 * Leaderboard stages around the start:
 *   PreShow       before the start: a clean broadcast-style clock; the last
 *                 10 seconds become single race-start numbers (10 ... 1)
 *   LaunchBanner  the moment it starts: a short "Mission live" pill
 *   AwaitOverlay  live, nobody has scored: card over the empty table
 * All timing uses the server clock (api.serverNow), not the projector PC's.
 */

const ease = [0.22, 1, 0.36, 1] as const;

/** True while the event hasn't started; flips exactly at the start time. */
export function useBeforeStart(startMs: number | null, closed: boolean) {
  const calc = () => startMs !== null && !closed && startMs > api.serverNow();
  const [before, setBefore] = useState(calc);
  useEffect(() => {
    setBefore(calc());
    if (startMs === null || closed) return;
    const left = startMs - api.serverNow();
    if (left <= 0) return;
    // setTimeout can't wait longer than ~24.8 days; re-check after that.
    const id = window.setTimeout(() => setBefore(calc()), Math.min(left + 30, 2 ** 31 - 1));
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMs, closed]);
  return before;
}

/** Server time, ticking faster in the last seconds before the start. */
function useStartTicker(startMs: number) {
  const [now, setNow] = useState(api.serverNow);
  useEffect(() => {
    let id = 0;
    const loop = () => {
      const n = api.serverNow();
      setNow(n);
      id = window.setTimeout(loop, startMs - n <= 12_000 ? 100 : 250);
    };
    loop();
    return () => window.clearTimeout(id);
  }, [startMs]);
  return now;
}

/** Digits that slide when they change. */
function Digits({ value }: { value: string }) {
  return (
    <span className="lb-digits">
      {value.split("").map((d, i) => (
        <span key={i} className="lb-digit">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={d}
              initial={{ y: "-45%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "45%", opacity: 0 }}
              transition={{ duration: 0.3, ease }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

/* ----------------------------------------------------------------- pre-show */

export function PreShow({ startMs, sound }: { startMs: number; sound: boolean }) {
  const now = useStartTicker(startMs);
  const left = Math.max(0, startMs - now);
  const secs = Math.ceil(left / 1000);
  const final = secs <= 10 && secs > 0;

  const parts = splitCountdown(secs * 1000);
  const shown = parts[0].value === "00" ? parts.slice(1) : parts;
  const when = new Date(startMs).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="lb-pre" aria-label="Countdown to the start">
      <p className="lb-pre-label">
        <i aria-hidden="true" />
        {final ? "Get ready" : "Mission starts in"}
      </p>

      <div className="lb-pre-stage">
        <AnimatePresence mode="wait" initial={false}>
          {final ? (
            <RaceNumber key="race" secs={secs} sound={sound} />
          ) : (
            <motion.div
              key="clock"
              className="lb-pre-clock"
              role="timer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
            >
              {shown.map((p, i) => (
                <div key={p.label} className="lb-pre-unit">
                  <Digits value={p.value} />
                  <small>{p.label}</small>
                  {i < shown.length - 1 && <span className="lb-pre-colon" aria-hidden="true" />}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="lb-pre-when">
        <span aria-hidden="true" />
        {when}
        <span aria-hidden="true" />
      </p>
    </section>
  );
}

/** Last 10 seconds: one number at a time, zooming in and out like a race start. */
function RaceNumber({ secs, sound }: { secs: number; sound: boolean }) {
  useEffect(() => {
    if (sound) playTick(secs <= 3);
  }, [secs, sound]);

  return (
    <motion.div
      className="lb-race"
      role="timer"
      aria-label={`${secs} seconds`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={secs}
          className={`lb-race-num${secs <= 3 ? " is-gold" : ""}`}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ duration: 0.22, ease }}
        >
          {secs}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------- start banner */

/** Short, calm "Mission live" pill the moment the event starts. */
export function LaunchBanner({ sound }: { sound: boolean }) {
  useEffect(() => {
    if (sound) playGo();
  }, [sound]);
  return (
    <motion.div
      className="lb-launch"
      role="status"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease }}
    >
      <i aria-hidden="true" /> Mission live · capture the flags
    </motion.div>
  );
}

/* ------------------------------------------------------- no flags yet */

/** Card over the empty top-10 table until the first flag is captured. */
export function AwaitOverlay({ event }: { event: api.EventState | null }) {
  const now = useNow(1000);
  const start = event ? new Date(event.startsAt).getTime() : null;
  const elapsed = start !== null ? Math.max(0, now - start) : null;

  return (
    <div className="lb-await" role="status">
      <motion.div
        className="lb-await-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <span className="lb-await-flag" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M5 21V4m0 0h11l-2 4 2 4H5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <b>Awaiting the first flag</b>
          <small>
            Mission live{elapsed !== null && <> · {formatClock(elapsed)} elapsed</>}
          </small>
        </div>
      </motion.div>
    </div>
  );
}
