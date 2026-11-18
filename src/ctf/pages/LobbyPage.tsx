import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { ASSETS } from "../../config/assets";
import { EVENT } from "../../config/event";
import { TitleArt } from "../../components/ui/TitleArt";
import { CtfShell } from "../components/CtfShell";
import { CtfHud, HudStat } from "../components/CtfHud";
import { HintCenter } from "../components/HintCenter";
import { CTF_PATHS, FLAG_FORMAT } from "../config";
import { splitCountdown, useLiveData, useNow, useOnSessionExpired } from "../hooks";
import * as api from "../api";

const RULES = [
  { title: "One mission at a time", body: "Missions unlock in order. Capture the current flag to reveal the next one." },
  { title: "Flag format", body: `Submit flags as ${FLAG_FORMAT}. Flags are not case-sensitive.` },
  { title: "Points and ties", body: "Harder missions are worth more. Ties are broken by time, which starts when your team opens the first mission." },
  { title: "One device per team", body: "Stay signed in on a single device. Signing in somewhere else may end your other session." },
  { title: "Play clean", body: "Don't share flags or solutions with other teams. Copying mission text is disabled." },
  { title: "Standings stay sealed", body: "The leaderboard is kept by the organisers. Results are announced after the event." },
];

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

  if (!session) return <Navigate to={CTF_PATHS.login} replace />;

  const startsAt = event ? new Date(event.startsAt).getTime() : null;
  const live = event ? api.isLive(event, now) : false;
  const closed = Boolean(event?.closed);
  const waiting = event && !live && !closed;
  const finished = Boolean(player?.finished);
  const started = Boolean(player?.startedAt);

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

      <main className="ctf-lobby">
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
                      : "Your team's clock starts when you open the first mission."}
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
            {(live || closed) && (
              <button type="button" className="ctf-btn ctf-btn--gold" onClick={() => navigate(CTF_PATHS.play)}>
                <span>
                  {finished ? "View debrief" : closed ? "Continue in practice mode" : started ? "Resume mission" : "Start mission"}
                </span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            )}
          </div>
        </motion.section>

        <motion.aside
          className="ctf-rules"
          aria-labelledby="rules-title"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="ctf-subbar">
            <span id="rules-title">Rules of engagement</span>
            <span>{String(RULES.length).padStart(2, "0")}</span>
          </div>
          <ol className="ctf-rules-list">
            {RULES.map((r, i) => (
              <li key={r.title}>
                <span className="ctf-rules-num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <b>{r.title}</b>
                  <p>{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </motion.aside>
      </main>
    </CtfShell>
  );
}
