import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useAnimationControls } from "framer-motion";
import { Check, Download, Flag, Lock, MessageSquareText, Paperclip, Send, ShieldAlert, X } from "lucide-react";
import { ASSETS } from "../../config/assets";
import { TitleArt } from "../../components/ui/TitleArt";
import { CtfShell } from "../components/CtfShell";
import { CtfHud, HudStat } from "../components/CtfHud";
import { HintCenter } from "../components/HintCenter";
import { CTF_PATHS, FLAG_FORMAT } from "../config";
import { formatClock, formatDuration, useLiveData, useNow, useOnSessionExpired } from "../hooks";
import * as api from "../api";
import type { Mission, PlayerHint, PlayerState } from "../api";

const MISSION_ART = [
  "/assets/missions/01-signals.jpg",
  "/assets/missions/02-flag.jpg",
  "/assets/missions/03-difficulty.jpg",
  "/assets/missions/04-rounds.jpg",
];

type Passed = { order: number; title: string; points: number; practice: boolean; finished: boolean };

export default function PlayPage() {
  const navigate = useNavigate();
  const session = api.getSession();
  const now = useNow(1000);
  const { data: event } = useLiveData(api.getEvent);
  const {
    data: player,
    error: playerError,
    reload: reloadPlayer,
  } = useLiveData(() => (session ? api.getPlayerState() : Promise.resolve(null)), [session?.teamId]);
  const { data: hints } = useLiveData(
    () => (session ? api.getHints() : Promise.resolve([] as PlayerHint[])),
    [session?.teamId],
  );
  useOnSessionExpired(() => navigate(CTF_PATHS.login, { replace: true, state: { expired: true } }));
  const [passed, setPassed] = useState<Passed | null>(null);
  const [endedNotice, setEndedNotice] = useState(false);
  const [practiceOk, setPracticeOk] = useState(false);
  const wasClosed = useRef<boolean | null>(null);

  const live = event ? api.isLive(event, now) : false;
  const closed = Boolean(event?.closed);

  // Start this team's clock the first time it enters while the event is live.
  useEffect(() => {
    if (session && live && player && player.startedAt === null) {
      void api.startMissions().then(reloadPlayer, () => undefined);
    }
  }, [session, live, player, reloadPlayer]);

  // Show the "event ended" notice when it closes (or is already closed on arrival).
  useEffect(() => {
    if (!event) return;
    if (event.closed && wasClosed.current !== true) {
      setEndedNotice(true);
      setPracticeOk(false);
    }
    if (!event.closed) {
      setEndedNotice(false);
      setPracticeOk(false);
    }
    wasClosed.current = event.closed;
  }, [event]);

  if (!session) return <Navigate to={CTF_PATHS.login} replace />;
  if (event && !live && !closed) return <Navigate to={CTF_PATHS.lobby} replace />;

  const logout = async () => {
    await api.logout();
    navigate(CTF_PATHS.login, { replace: true });
  };

  const practice = closed && practiceOk;
  const done = Boolean(player?.finished);
  const clockMs = player?.startedAt ? (player.finishedAt ?? now) - player.startedAt : 0;

  return (
    <CtfShell art={ASSETS.ctfBg} artPosition="center 55%" tone="dim" title={done ? "Debrief" : "Missions"} className="ctf--player">
      <CtfHud label={practice ? "Practice mode" : "Virtual CTF"} onLogout={logout}>
        {player && (
          <>
            <HudStat label="Flags" value={`${player.solved}/${player.total}`} tone="green" />
            <HudStat label="Points" value={player.score.toLocaleString("en-IN")} tone="gold" />
            <HudStat label="Clock" value={<span className="ctf-mono">{formatClock(clockMs)}</span>} />
          </>
        )}
        <HintCenter teamId={session.teamId} />
      </CtfHud>

      {practice && (
        <div className="ctf-strip" role="status">
          <b>Practice mode</b> The event has ended. Flags you capture now are not scored.
        </div>
      )}

      {!player || !event ? (
        <Loading error={playerError} />
      ) : done ? (
        <Debrief player={player} onLogout={logout} />
      ) : player.total === 0 ? (
        <Loading error="The organisers haven't published any missions yet. This page updates on its own." />
      ) : (
        <main className="ctf-play">
          <MissionMenu player={player} />
          {player.current && (
            <MissionPanel
              key={player.current.id}
              mission={player.current}
              total={player.total}
              hints={(hints ?? []).filter((h) => h.target.kind === "mission" && h.target.missionId === player.current!.id)}
              disabled={closed && !practiceOk}
              onPassed={(points, isPractice, finished) =>
                setPassed({
                  order: player.current!.order,
                  title: player.current!.title,
                  points,
                  practice: isPractice,
                  finished,
                })
              }
              onStale={reloadPlayer}
            />
          )}
        </main>
      )}

      <AnimatePresence>
        {passed && <PassedOverlay passed={passed} onDone={() => setPassed(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {endedNotice && !done && (
          <EndedModal
            message={event?.closedMessage ?? ""}
            onPractice={() => {
              setPracticeOk(true);
              setEndedNotice(false);
            }}
            onExit={logout}
          />
        )}
      </AnimatePresence>
    </CtfShell>
  );
}

/* ------------------------------------------------------------- pieces */

function Loading({ error }: { error?: string | null }) {
  return (
    <div className="ctf-loading" role="status">
      <span className="ctf-loading-bar" aria-hidden="true" />
      <p>{error ? "Waiting for the server" : "Loading missions…"}</p>
      {error && <p className="ctf-loading-error">{error}</p>}
    </div>
  );
}

function MissionMenu({ player }: { player: PlayerState }) {
  const position = player.slots.findIndex((s) => s.status === "current");
  return (
    <nav className="ctf-menu" aria-label="Missions">
      <div className="ctf-menu-banner">
        <img src="/assets/eligibility/lobby-banner.jpg" alt="" />
        <span>Missions</span>
      </div>
      <div className="ctf-subbar">
        <span>Operation Decodex</span>
        <span>
          {String(position < 0 ? player.total : position + 1).padStart(2, "0")} / {String(player.total).padStart(2, "0")}
        </span>
      </div>
      <ol className="ctf-menu-rows">
        {player.slots.map((s) => (
          <li key={s.id} className={`ctf-menu-row is-${s.status}`} aria-current={s.status === "current" ? "step" : undefined}>
            <span className="ctf-menu-num">{String(s.order).padStart(2, "0")}</span>
            <span className="ctf-menu-title">
              {s.title ?? "Locked"}
              {s.category && <small>{s.category}</small>}
            </span>
            <span className="ctf-menu-meta">
              {s.status === "solved" && <Check size={16} aria-label="Solved" />}
              {s.status === "practice" && <small>Practice</small>}
              {s.status === "locked" && <Lock size={14} aria-label="Locked" />}
              {s.status === "current" && <b>{s.points}</b>}
            </span>
          </li>
        ))}
      </ol>
      <div className="ctf-menu-foot">
        <span>Flags captured</span>
        <div className="ctf-flags" aria-label={`${player.solved} of ${player.total} flags captured`}>
          {player.slots.map((s) => (
            <Flag key={s.id} size={16} className={s.status === "solved" ? "is-on" : s.status === "practice" ? "is-practice" : ""} aria-hidden="true" />
          ))}
        </div>
      </div>
    </nav>
  );
}

function MissionPanel({
  mission,
  total,
  hints,
  disabled,
  onStale,
  onPassed,
}: {
  mission: Mission;
  total: number;
  hints: PlayerHint[];
  disabled: boolean;
  onStale: () => void;
  onPassed: (points: number, practice: boolean, finished: boolean) => void;
}) {
  const [flag, setFlag] = useState("");
  const [busy, setBusy] = useState(false);
  // Synchronous guard: React state updates too late to stop a double Enter.
  const inFlight = useRef(false);
  const [wrong, setWrong] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shake = useAnimationControls();

  useEffect(() => {
    if (!copyNote) return;
    const t = window.setTimeout(() => setCopyNote(false), 2200);
    return () => window.clearTimeout(t);
  }, [copyNote]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || inFlight.current || disabled) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitFlag(mission.id, flag);
      if (res.correct) {
        // Stay locked: this panel is replaced by the next mission's.
        onPassed(res.points, res.practice, res.finished);
        return;
      } else {
        inFlight.current = false;
        setWrong((n) => n + 1);
        setError("Wrong flag. Check the format and try again.");
        void shake.start({ x: [0, -10, 9, -6, 4, 0], transition: { duration: 0.4 } });
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    } catch (err) {
      inFlight.current = false;
      setError(err instanceof Error ? err.message : "Couldn't submit. Try again.");
      // The mission list may have changed under us (reordered or deleted).
      onStale();
    }
    setBusy(false);
  };

  const blockCopy = (e: ClipboardEvent) => {
    e.preventDefault();
    setCopyNote(true);
  };

  return (
    <motion.article
      className="ctf-mission"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="mission-title"
    >
      <div className="ctf-mission-art">
        <img src={MISSION_ART[(mission.order - 1) % MISSION_ART.length]} alt="" />
        <div className="ctf-mission-tags">
          <span className="ctf-tag">
            Mission {String(mission.order).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="ctf-tag ctf-tag--dark">{mission.category}</span>
          <span className="ctf-tag ctf-tag--gold">{mission.points} pts</span>
        </div>
      </div>

      <div className="ctf-mission-body">
        <h1 id="mission-title" className="ctf-mission-title">
          {mission.title}
        </h1>
        <div
          className="ctf-mission-prompt"
          onCopy={blockCopy}
          onCut={blockCopy}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p>{mission.prompt}</p>
        </div>
        <AnimatePresence>
          {copyNote && (
            <motion.p className="ctf-note" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              Copying mission text is disabled.
            </motion.p>
          )}
        </AnimatePresence>

        {mission.attachments && mission.attachments.length > 0 && (
          <div className="ctf-files">
            <span className="ctf-files-label">Intel</span>
            <ul>
              {mission.attachments.map((a) => (
                <li key={a.label}>
                  {a.url && /^https?:\/\//i.test(a.url) ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" download>
                      <Download size={15} aria-hidden="true" />
                      <span>{a.label}</span>
                      {a.size && <small>{a.size}</small>}
                    </a>
                  ) : (
                    <span className="ctf-file-static">
                      <Paperclip size={15} aria-hidden="true" />
                      <span>{a.label}</span>
                      {a.size && <small>{a.size}</small>}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <AnimatePresence initial={false}>
          {hints.length > 0 && (
            <motion.div
              className="ctf-mission-hints"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <span className="ctf-files-label">
                <MessageSquareText size={14} aria-hidden="true" /> Intel from control
              </span>
              <ul>
                {hints.map((h) => (
                  <motion.li key={h.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
                    {h.message}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <form className={`ctf-flag-form${error ? " has-error" : ""}`} onSubmit={submit}>
          <label htmlFor="flag-input">Submit flag</label>
          <motion.div className="ctf-flag-row" animate={shake}>
            <input
              ref={inputRef}
              id="flag-input"
              className="ctf-mono"
              value={flag}
              onChange={(e) => {
                setFlag(e.target.value);
                if (error) setError(null);
              }}
              placeholder={FLAG_FORMAT}
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              disabled={disabled}
              aria-invalid={Boolean(error)}
              aria-describedby="flag-feedback"
              autoFocus
            />
            <button type="submit" className={`ctf-btn ctf-btn--gold${busy ? " is-busy" : ""}`} disabled={busy || disabled || !flag.trim()}>
              <Send size={16} aria-hidden="true" />
              <span>{busy ? "Checking…" : "Submit"}</span>
            </button>
          </motion.div>
          <p id="flag-feedback" className="ctf-flag-feedback" aria-live="polite">
            {error ? (
              <>
                <ShieldAlert size={15} aria-hidden="true" /> {error}
                {wrong > 1 && <small>{wrong} wrong attempts</small>}
              </>
            ) : (
              <span className="ctf-muted">Not case-sensitive. Spaces at the ends are ignored.</span>
            )}
          </p>
        </form>
      </div>
    </motion.article>
  );
}

function PassedOverlay({ passed, onDone }: { passed: Passed; onDone: () => void }) {
  // The parent re-renders every second (HUD clock); keep the timer stable.
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const t = window.setTimeout(() => done.current(), 3000);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        done.current();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", key);
    };
  }, []);

  return (
    <motion.div
      className="ctf-passed"
      role="alertdialog"
      aria-label="Mission passed"
      onClick={() => done.current()}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        className="ctf-passed-band"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        exit={{ scaleY: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.h2
          initial={{ scale: 1.25, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <TitleArt text="Mission Passed" size="page" />
        </motion.h2>
        <motion.p
          className="ctf-passed-points"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {passed.practice ? "Practice · not scored" : `+${passed.points} points`}
        </motion.p>
        <motion.p className="ctf-passed-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}>
          Mission {String(passed.order).padStart(2, "0")} · {passed.title}
          <span>{passed.finished ? "That was the last one." : "Next mission unlocked."}</span>
        </motion.p>
      </motion.div>
      <p className="ctf-passed-hint">Click or press Enter to continue</p>
    </motion.div>
  );
}

function EndedModal({ message, onPractice, onExit }: { message: string; onPractice: () => void; onExit: () => void }) {
  return (
    <motion.div className="ctf-modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div
        className="ctf-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ended-title"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
      >
        <h2 id="ended-title">
          <TitleArt text="Event Ended" />
        </h2>
        {message && <p className="ctf-modal-quote">“{message}”</p>}
        <p className="ctf-muted">
          Your scored flags are locked in. You can keep solving the remaining missions for practice. They won't count toward
          your score.
        </p>
        <div className="ctf-modal-actions">
          <button type="button" className="ctf-btn ctf-btn--gold" onClick={onPractice} autoFocus>
            Continue in practice mode
          </button>
          <button type="button" className="ctf-btn ctf-btn--ghost" onClick={onExit}>
            <X size={16} aria-hidden="true" /> Log out
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Debrief({ player, onLogout }: { player: PlayerState; onLogout: () => void }) {
  const practiceCount = player.slots.filter((s) => s.status === "practice").length;
  const allScored = player.solved === player.total;
  const time = player.startedAt && player.finishedAt ? player.finishedAt - player.startedAt : null;

  return (
    <main className="ctf-debrief">
      <motion.div
        className="ctf-debrief-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="ctf-kicker">Debrief</p>
        <h1>
          <TitleArt text={allScored ? "Heist Complete" : "Event Ended"} size="page" />
        </h1>
        <p className="ctf-debrief-lede">
          {allScored
            ? "Every flag captured. The city's signals are yours."
            : "That's a wrap. Here's what your crew pulled off."}
        </p>

        <dl className="ctf-debrief-stats">
          <div>
            <dt>Flags captured</dt>
            <dd>
              {player.solved}
              <small>/{player.total}</small>
            </dd>
          </div>
          <div>
            <dt>Points</dt>
            <dd className="is-gold">{player.score.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt>Total time</dt>
            <dd>{allScored ? formatDuration(time) : "--"}</dd>
          </div>
        </dl>
        {practiceCount > 0 && (
          <p className="ctf-muted">
            Plus {practiceCount} practice {practiceCount === 1 ? "flag" : "flags"} after the event ended (not scored).
          </p>
        )}

        <p className="ctf-debrief-note">
          Standings stay with the organisers. Qualified teams will be contacted on their registered email.
        </p>
        <button type="button" className="ctf-btn ctf-btn--cream" onClick={onLogout}>
          Log out
        </button>
      </motion.div>
    </main>
  );
}
