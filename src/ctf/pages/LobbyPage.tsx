import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Check, Lock } from "lucide-react";
import { ASSETS } from "../../config/assets";
import { EVENT } from "../../config/event";
import { TitleArt } from "../../components/ui/TitleArt";
import { CtfShell } from "../components/CtfShell";
import { CtfHud, HudStat } from "../components/CtfHud";
import { HintCenter } from "../components/HintCenter";
import { CTF_PATHS } from "../config";
import { RULES, RULES_ACK, RULES_INTRO, hasAgreedToRules, setAgreedToRules } from "../rules";
import { splitCountdown, useLiveData, useNow, useOnSessionExpired } from "../hooks";
import * as api from "../api";

export default function LobbyPage() {
  const navigate = useNavigate();
  const session = api.getSession();
  const now = useNow(1000);
  const { data: event, error: eventError } = useLiveData(api.getEvent);
  const { data: player } = useLiveData(
    () => (session ? api.getPlayerState() : Promise.resolve(null)),
    [session?.teamId],
  );
  useOnSessionExpired(() => navigate(CTF_PATHS.login, { replace: true, state: { expired: true } }));
  const location = useLocation();
  const [agreed, setAgreed] = useState(() => (session ? hasAgreedToRules(session.teamId) : false));
  const [nudge, setNudge] = useState(0);
  const agreeRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLInputElement>(null);

  /** Scroll to the agreement and make it pulse. */
  const showAgreement = () => {
    agreeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    checkRef.current?.focus({ preventScroll: true });
    setNudge((n) => n + 1);
  };

  // Sent back from the mission screen without having agreed.
  const needRules = Boolean((location.state as { needRules?: boolean } | null)?.needRules);
  useEffect(() => {
    if (needRules) window.setTimeout(showAgreement, 400);
  }, [needRules]);

  useEffect(() => {
    if (!nudge) return;
    const t = window.setTimeout(() => setNudge(0), 1400);
    return () => window.clearTimeout(t);
  }, [nudge]);

  if (!session) return <Navigate to={CTF_PATHS.login} replace />;

  const startsAt = event ? new Date(event.startsAt).getTime() : null;
  const live = event ? api.isLive(event, now) : false;
  const closed = Boolean(event?.closed);
  const waiting = event && !live && !closed;
  const finished = Boolean(player?.finished);
  const started = Boolean(player?.startedAt);
  const needsAgreement = !agreed && !closed && !finished;

  const toggleAgreed = (on: boolean) => {
    setAgreed(on);
    setAgreedToRules(session.teamId, on);
  };

  const logout = async () => {
    await api.logout();
    navigate(CTF_PATHS.login, { replace: true });
  };

  const status = !event ? "Connecting" : closed ? "Ended" : live ? "Live" : "Standby";

  return (
    <CtfShell art={ASSETS.ctfBg} artPosition="center 55%" tone="dim" title="Briefing room" className="ctf--player">
      <CtfHud label="Virtual CTF" onLogout={logout}>
        <HudStat label="Crew" value={session.teamName} />
        <HudStat label="Status" value={<span className={`ctf-pill is-${status.toLowerCase()}`}>{status}</span>} />
        <HintCenter teamId={session.teamId} />
      </CtfHud>

      <main className="ctf-lobby ctf-lobby--stack">
        <motion.section
          className="ctf-lobby-main"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="ctf-kicker">DECODEX {EVENT.edition} // Online qualifier</p>
          <h1 className="ctf-lobby-title">
            <TitleArt text="Briefing Room" size="page" />
          </h1>
          <p className="ctf-lobby-hello">
            Welcome in, <b>{session.teamName}</b>.{" "}
            {waiting && "Read the briefing while the clock runs down."}
            {live && !finished && (started ? "Your mission is still running." : "The missions are open. Good luck.")}
            {live && finished && "Every mission is done. Head to your debrief."}
            {closed && "The event has ended."}
          </p>

          {!event && !eventError && <div className="ctf-skeleton ctf-skeleton--clock" aria-label="Loading event status" />}
          {!event && eventError && (
            <p className="ctf-alert ctf-lobby-error" role="alert">
              <span>{eventError}</span>
            </p>
          )}

          {waiting && startsAt && (
            <div className="ctf-countdown" role="timer" aria-live="off">
              <p className="ctf-countdown-label">Missions unlock in</p>
              <div className="ctf-countdown-grid">
                {splitCountdown(startsAt - now).map((u) => (
                  <div className="ctf-countdown-cell" key={u.label}>
                    <b>{u.value}</b>
                    <span>{u.label}</span>
                  </div>
                ))}
              </div>
              <p className="ctf-countdown-when">
                {new Date(startsAt).toLocaleString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {live && (
            <div className="ctf-live-banner">
              <span className="ctf-live-dot" aria-hidden="true" />
              <div>
                <b>{finished ? "Missions complete" : "Missions are live"}</b>
                <span>
                  {finished
                    ? "Your flags are in. See your debrief."
                    : started
                      ? `${player?.solved ?? 0} of ${player?.total ?? 0} flags captured so far.`
                      : "The clock runs from the event start, the same for every team."}
                </span>
              </div>
            </div>
          )}

          {closed && (
            <div className="ctf-live-banner is-ended">
              <Lock size={20} aria-hidden="true" />
              <div>
                <b>Event ended</b>
                <span>{event?.closedMessage}</span>
              </div>
            </div>
          )}

          <div className="ctf-lobby-actions">
            {waiting && (
              <button type="button" className="ctf-btn ctf-btn--locked" disabled>
                <Lock size={16} aria-hidden="true" />
                <span>Locked until start</span>
              </button>
            )}
            {needsAgreement && (
              <button type="button" className={`ctf-btn ${live ? "ctf-btn--gold" : "ctf-btn--ghost"}`} onClick={showAgreement}>
                <span>Read &amp; accept the rules{live ? " to start" : ""}</span>
                <ArrowDown size={18} aria-hidden="true" />
              </button>
            )}
            {!needsAgreement && waiting && (
              <p className="ctf-agree-done">
                <Check size={16} aria-hidden="true" /> Rules accepted. You're ready for the start.
              </p>
            )}
            {(live || closed) && !needsAgreement && (
              <button type="button" className="ctf-btn ctf-btn--gold" onClick={() => navigate(CTF_PATHS.play)}>
                <span>
                  {finished || closed ? "View debrief" : started ? "Resume mission" : "Start mission"}
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </motion.section>

        <motion.section
          className="ctf-rules ctf-rules--official"
          aria-labelledby="rules-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="ctf-subbar">
            <span id="rules-title">DecodeX · Rules &amp; Regulations</span>
            <span>{String(RULES.length).padStart(2, "0")} rules</span>
          </div>
          <p className="ctf-rules-intro">{RULES_INTRO}</p>
          <ol className="ctf-rules-list">
            {RULES.map((r, i) => (
              <li key={r.title}>
                <span className="ctf-rules-num">{String(i + 1).padStart(2, "0")}</span>
                <div className="ctf-rules-body">
                  <b>{r.title}</b>
                  {r.body}
                  {r.note && <p className="ctf-rules-note">{r.note}</p>}
                </div>
              </li>
            ))}
          </ol>

          <div
            id="rules-agree"
            ref={agreeRef}
            className={`ctf-agree${agreed ? " is-on" : ""}${nudge ? " is-nudge" : ""}`}
          >
            <label className="ctf-agree-label">
              <input
                ref={checkRef}
                type="checkbox"
                checked={agreed}
                disabled={closed || finished}
                onChange={(e) => toggleAgreed(e.target.checked)}
              />
              <span className="ctf-agree-box" aria-hidden="true">
                <Check size={18} strokeWidth={3} />
              </span>
              <span className="ctf-agree-text">
                <b>I have read the DecodeX Rules &amp; Regulations and agree to abide by them.</b>
                <small>
                  I'm agreeing on behalf of my team. {RULES_ACK}
                </small>
              </span>
            </label>
            {agreed && live && !finished && (
              <button type="button" className="ctf-btn ctf-btn--gold ctf-agree-go" onClick={() => navigate(CTF_PATHS.play)}>
                <span>{started ? "Resume mission" : "Start mission"}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
            {!agreed && !closed && !finished && (
              <p className="ctf-agree-hint">Tick the box to unlock the missions.</p>
            )}
          </div>
        </motion.section>
      </main>
    </CtfShell>
  );
}
