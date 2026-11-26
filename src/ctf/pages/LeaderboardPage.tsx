import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, Navigate } from "react-router-dom";
import { AnimatePresence, animate, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Crown, Expand, LayoutDashboard, RefreshCw, Shrink, WifiOff } from "lucide-react";
import { EVENT } from "../../config/event";
import { ASSETS } from "../../config/assets";
import { CtfShell } from "../components/CtfShell";
import { TeamAvatar } from "../components/TeamAvatar";
import { CTF_PATHS } from "../config";
import { formatClock, useAdminSession, useLiveData, useNow } from "../hooks";
import * as api from "../api";
import "../leaderboard.css";

/*
 * Big-screen live leaderboard for organisers (/admin/leaderboard).
 * Fits one screen (no scrolling): podium + top 10.
 *
 * Data: the same admin-only `ctf_admin_leaderboard` RPC as the control room
 * (api.getLeaderboard). The server computes points, solves and the order;
 * this page only displays it. Live: api.subscribe() (inside useLiveData)
 * refetches when ctf_solves / ctf_progress rows change over Supabase
 * Realtime, at most once a second. A slow backup poll covers a dropped
 * connection.
 */

const BG = ASSETS.ctfBg;
const TOP_N = 10;
/** Backup refresh in case the realtime connection drops silently. */
const BACKUP_POLL_MS = 30_000;
/** How long "+100" and rank arrows stay on screen. */
const CHANGE_MS = 4500;

type Ranked = api.LeaderboardRow & { rank: number };
type Change = { delta: number; move: number; key: number };

const fmtPts = (n: number) => n.toLocaleString("en-IN");
const MEDAL = ["gold", "silver", "bronze"] as const;
const PLACE = ["1st", "2nd", "3rd"] as const;

/* ------------------------------------------------------------ page gate */

/** Same protection as the control room: the server confirms admin access first. */
export default function LeaderboardPage() {
  const admin = useAdminSession();
  if (admin === "checking") {
    return (
      <CtfShell art={BG} tone="dim" title="Live leaderboard" className="ctf--board">
        <div className="ctf-loading" role="status">
          <span className="ctf-loading-bar" aria-hidden="true" />
          <p>Checking clearance…</p>
        </div>
      </CtfShell>
    );
  }
  if (!admin) return <Navigate to={CTF_PATHS.adminLogin} replace state={{ from: CTF_PATHS.leaderboard }} />;
  return <LiveBoard />;
}

/* ----------------------------------------------------------- live board */

function LiveBoard() {
  const board = useLiveData(api.getLeaderboard);
  const event = useLiveData(api.getEvent);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    if (board.data) setUpdatedAt(Date.now());
  }, [board.data]);

  // Backup poll (only while visible) + catch up when the screen wakes or
  // the network returns. Realtime does the real work.
  const reload = board.reload;
  useEffect(() => {
    const catchUp = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const id = window.setInterval(catchUp, BACKUP_POLL_MS);
    document.addEventListener("visibilitychange", catchUp);
    window.addEventListener("online", catchUp);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", catchUp);
      window.removeEventListener("online", catchUp);
    };
  }, [reload]);

  // Server order is authoritative; ranks are positions in the latest
  // snapshot. Dedupe by team id defensively.
  const ranked = useMemo<Ranked[] | null>(() => {
    if (!board.data) return null;
    const seen = new Set<string>();
    const out: Ranked[] = [];
    for (const r of board.data) {
      if (seen.has(r.teamId)) continue;
      seen.add(r.teamId);
      out.push({ ...r, rank: out.length + 1 });
    }
    return out;
  }, [board.data]);

  const changes = useBoardChanges(ranked);
  const scored = useMemo(() => (ranked ?? []).filter((r) => r.score > 0), [ranked]);
  const top = scored.slice(0, TOP_N);
  const leader = scored[0];

  const ev = event.data;
  const feed: FeedState = board.error && ranked ? "reconnecting" : ev?.closed ? "final" : "live";

  return (
    <CtfShell art={BG} tone="dim" title="Live leaderboard" className="ctf--board">
      <div className="lb-wash" aria-hidden="true" />
      <BackgroundFx />

      <div className="lb-stage">
        <header className="lb-top">
          <div className="lb-top-l">
            <span className="lb-brand">
              {EVENT.name} <b>{EVENT.edition}</b>
            </span>
            <LiveChip state={feed} />
            <span className="lb-updated">
              Updated <UpdatedAgo at={updatedAt} />
            </span>
          </div>
          <div className="lb-top-r">
            <EventClock event={ev} />
            <FullscreenButton />
            <Link to={CTF_PATHS.admin} className="lb-icon-btn" title="Control room" aria-label="Control room">
              <LayoutDashboard size={17} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <h1 className="ctf-sr">Live leaderboard</h1>
        {/* Outline drawn from the letters' silhouette, not the font's
            contours: Manrope's glyphs are built from overlapping pieces
            (e.g. the R's leg), which a plain text-stroke shows as extra
            lines inside the letters. */}
        <svg className="lb-svg-defs" width="0" height="0" aria-hidden="true" focusable="false">
          <filter id="lb-outline" x="-2%" y="-10%" width="104%" height="120%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius="1.6" result="grown" />
            <feComposite in="grown" in2="SourceAlpha" operator="out" result="ring" />
            <feFlood floodColor="#ff4f8b" floodOpacity="0.6" />
            <feComposite in2="ring" operator="in" />
          </filter>
        </svg>
        <div className="lb-ghost" aria-hidden="true">
          Leaderboard
        </div>

        <main className="lb-main">
          {!ranked && board.error ? (
            <ErrorState onRetry={() => void board.reload()} retrying={board.loading} />
          ) : !ranked ? (
            <BoardSkeleton />
          ) : (
            <>
              <Podium teams={scored.slice(0, 3)} changes={changes} />

              <p className="lb-caption" aria-live="polite">
                {leader ? (
                  <>
                    <b>{leader.teamName}</b> is on top of the leaderboard
                  </>
                ) : (
                  "Waiting for the first flag"
                )}
              </p>

              <section className="lb-table" aria-label={`Top ${TOP_N} teams`}>
                <div className="lb-thead" aria-hidden="true">
                  <span>Team</span>
                  <span>Place</span>
                  <span>Flags</span>
                  <span>Points</span>
                </div>
                {top.length ? (
                  <ol className="lb-tbody">
                    <AnimatePresence initial={false}>
                      {top.map((r) => (
                        <Row key={r.teamId} row={r} change={changes[r.teamId]} />
                      ))}
                    </AnimatePresence>
                  </ol>
                ) : (
                  <p className="lb-empty">The board fills in live as teams capture flags.</p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </CtfShell>
  );
}

/* -------------------------------------------------------- change tracking */

/**
 * Compares each new snapshot with the previous one: score gains ("+100")
 * and rank moves per team, shown for a few seconds. Nothing on first load.
 */
function useBoardChanges(rows: Ranked[] | null) {
  const prev = useRef<Map<string, { score: number; rank: number }> | null>(null);
  const timers = useRef(new Map<string, number>());
  const [changes, setChanges] = useState<Record<string, Change>>({});

  useEffect(() => {
    if (!rows) return;
    const before = prev.current;
    prev.current = new Map(rows.map((r) => [r.teamId, { score: r.score, rank: r.rank }]));
    if (!before) return;

    const fresh: Record<string, Change> = {};
    for (const r of rows) {
      const p = before.get(r.teamId);
      if (!p || r.score <= 0) continue;
      const delta = r.score - p.score;
      const move = p.rank - r.rank;
      if (delta > 0 || move !== 0) fresh[r.teamId] = { delta: Math.max(0, delta), move, key: Date.now() };
    }
    const ids = Object.keys(fresh);
    if (!ids.length) return;

    setChanges((c) => ({ ...c, ...fresh }));
    for (const id of ids) {
      window.clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          setChanges((c) => {
            const { [id]: _gone, ...rest } = c;
            return rest;
          });
        }, CHANGE_MS),
      );
    }
  }, [rows]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach((id) => window.clearTimeout(id));
  }, []);

  return changes;
}

/* ---------------------------------------------------------------- podium */

function Podium({ teams, changes }: { teams: Ranked[]; changes: Record<string, Change> }) {
  return (
    <div className="lb-podium">
      {/* visual order: 2nd, 1st, 3rd */}
      {[1, 0, 2].map((i) => {
        const t = teams[i];
        return (
          <div key={MEDAL[i]} className={`lb-pod is-${MEDAL[i]}`}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={t?.teamId ?? "empty"}
                className="lb-pod-who"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {t ? (
                  <span className="lb-pod-ring">
                    {i === 0 && <Crown className="lb-crown" size={34} aria-hidden="true" />}
                    <TeamAvatar name={t.teamName} size="var(--pod-av)" className="lb-pod-avatar" />
                  </span>
                ) : (
                  <span className="lb-pod-void" aria-hidden="true" />
                )}
                <span className="lb-pod-name" title={t?.teamName}>
                  {t ? t.teamName : "—"}
                </span>
              </motion.div>
            </AnimatePresence>

            <div className={`lb-pod-block${t && changes[t.teamId]?.delta ? " is-flash" : ""}`}>
              <span className="lb-shine" aria-hidden="true" />
              <span className="lb-pod-place">{PLACE[i]}</span>
              <span className="lb-pill">
                {t ? <AnimatedNumber value={t.score} /> : "–"} Pts
                <Delta change={t ? changes[t.teamId] : undefined} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ rows */

const Row = memo(function Row({ row: r, change }: { row: Ranked; change?: Change }) {
  const medal = r.rank <= 3 ? MEDAL[r.rank - 1] : null;
  return (
    <motion.li
      layout="position"
      className={`lb-tr${medal ? ` is-top is-${medal}` : ""}${change?.delta ? " is-flash" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ layout: { type: "spring", stiffness: 240, damping: 30 }, duration: 0.3 }}
    >
      <span className="lb-team">
        <TeamAvatar name={r.teamName} size="var(--row-av)" />
        <span className="lb-team-name" title={r.teamName}>
          {r.teamName}
        </span>
      </span>
      <span className="lb-place">
        <span className={`lb-place-n${medal ? ` is-${medal}` : ""}`}>{r.rank}</span>
        <Move change={change} />
      </span>
      <span className="lb-flags">
        {r.solved}/{r.total}
      </span>
      <span className="lb-points">
        <Delta change={change} />
        <AnimatedNumber value={r.score} />
      </span>
    </motion.li>
  );
});

function Delta({ change }: { change?: Change }) {
  return (
    <AnimatePresence>
      {change && change.delta > 0 && (
        <motion.span
          key={change.key}
          className="lb-delta"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
        >
          +{fmtPts(change.delta)}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function Move({ change }: { change?: Change }) {
  return (
    <AnimatePresence>
      {change && change.move !== 0 && (
        <motion.span
          key={change.key}
          className={`lb-move ${change.move > 0 ? "is-up" : "is-down"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-label={change.move > 0 ? `Up ${change.move}` : `Down ${-change.move}`}
        >
          {change.move > 0 ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />}
          {Math.abs(change.move)}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Counts from the old value to the new one when the score changes. */
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = shown.current;
    shown.current = value;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (from === value || reduce) {
      el.textContent = fmtPts(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = fmtPts(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value]);

  return <span ref={ref} className="lb-count" />;
}

/* ------------------------------------------------------- background fx */

/** Deterministic 0-1 value for particle i (stable across renders). */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  left: `${(rand(i, 1) * 100).toFixed(2)}%`,
  size: `${(2 + rand(i, 2) * 4).toFixed(1)}px`,
  dur: `${(14 + rand(i, 3) * 16).toFixed(1)}s`,
  delay: `${(-rand(i, 4) * 30).toFixed(1)}s`,
  drift: `${((rand(i, 5) - 0.5) * 120).toFixed(0)}px`,
}));

/** Slow rising specks of light. CSS-only animation (transform/opacity). */
const BackgroundFx = memo(function BackgroundFx() {
  return (
    <div className="lb-fx" aria-hidden="true">
      {PARTICLES.map((p, i) => (
        <i
          key={i}
          className="lb-spark"
          style={
            {
              left: p.left,
              "--s": p.size,
              "--d": p.dur,
              "--dl": p.delay,
              "--dx": p.drift,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
});

/* ----------------------------------------------------------- top bar */

type FeedState = "live" | "reconnecting" | "final";

function LiveChip({ state }: { state: FeedState }) {
  if (state === "reconnecting") {
    return (
      <span className="lb-live is-warn" role="status">
        <WifiOff size={13} aria-hidden="true" /> Reconnecting
      </span>
    );
  }
  if (state === "final") {
    return (
      <span className="lb-live is-final" role="status">
        Final
      </span>
    );
  }
  return (
    <span className="lb-live" role="status">
      <i aria-hidden="true" /> Live
    </span>
  );
}

/** "just now" / "12s ago", ticking on its own so the board doesn't re-render. */
function UpdatedAgo({ at }: { at: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!at) return <b>connecting…</b>;
  const s = Math.max(0, Math.floor((now - at) / 1000));
  return <b>{s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`}</b>;
}

/** Elapsed time since the event start (server clock), or a countdown before it. */
function EventClock({ event }: { event: api.EventState | null }) {
  const now = useNow(1000);
  if (!event) return null;
  const start = new Date(event.startsAt).getTime();
  const label = event.closed ? "Event ended" : start > now ? "Starts in" : "Elapsed";
  return (
    <span className="lb-clock">
      <small>{label}</small>
      {!event.closed && <b>{formatClock(Math.abs(now - start))}</b>}
    </span>
  );
}

function FullscreenButton() {
  const [full, setFull] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const f = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  if (!document.fullscreenEnabled) return null;
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };
  const label = full ? "Exit full screen" : "Full screen";
  return (
    <button type="button" className="lb-icon-btn" onClick={toggle} title={label} aria-label={label}>
      {full ? <Shrink size={17} aria-hidden="true" /> : <Expand size={17} aria-hidden="true" />}
    </button>
  );
}

/* ------------------------------------------------------ loading / error */

function BoardSkeleton() {
  return (
    <div className="lb-skeleton" role="status" aria-label="Loading leaderboard">
      <div className="lb-podium">
        {[1, 0, 2].map((i) => (
          <div key={i} className={`lb-pod is-${MEDAL[i]}`}>
            <div className="lb-pod-who">
              <span className="lb-sk lb-sk-av" />
              <span className="lb-sk lb-sk-line" />
            </div>
            <div className="lb-pod-block" />
          </div>
        ))}
      </div>
      <p className="lb-caption">&nbsp;</p>
      <section className="lb-table">
        <div className="lb-thead">
          <span>Team</span>
          <span>Place</span>
          <span>Flags</span>
          <span>Points</span>
        </div>
        <ol className="lb-tbody">
          {Array.from({ length: TOP_N }, (_, i) => (
            <li key={i} className="lb-tr">
              <span className="lb-team">
                <span className="lb-sk lb-sk-dot" />
                <span className="lb-sk lb-sk-line" />
              </span>
              <span className="lb-sk lb-sk-short" />
              <span className="lb-sk lb-sk-short" />
              <span className="lb-sk lb-sk-short lb-points" />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** No internal error text: the projector audience doesn't need it. */
function ErrorState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <section className="lb-error" role="alert">
      <WifiOff size={28} aria-hidden="true" />
      <h2>Unable to load live leaderboard</h2>
      <p>The board reconnects on its own once the server is reachable.</p>
      <button type="button" className="lb-retry" onClick={onRetry} disabled={retrying}>
        <RefreshCw size={16} aria-hidden="true" className={retrying ? "is-spinning" : undefined} />
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </section>
  );
}
