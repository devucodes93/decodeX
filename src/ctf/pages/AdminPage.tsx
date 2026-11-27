import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flag, MessageSquareText, MonitorPlay, Play, RefreshCw, Trophy, Users } from "lucide-react";
import { EVENT } from "../../config/event";
import { TitleArt } from "../../components/ui/TitleArt";
import { CtfShell } from "../components/CtfShell";
import { CtfHud, HudStat } from "../components/CtfHud";
import { CTF_PATHS } from "../config";
import { formatTime, useAdminSession, useLiveData, useNow } from "../hooks";
import * as api from "../api";
import { LeaderboardTab } from "../admin/LeaderboardTab";
import { TeamsTab } from "../admin/TeamsTab";
import { MissionsTab } from "../admin/MissionsTab";
import { HintsTab } from "../admin/HintsTab";
import { EventTab } from "../admin/EventTab";
import { ActivityTab } from "../admin/ActivityTab";
import { useToast } from "../admin/ui";

type Tab = "leaderboard" | "teams" | "missions" | "hints" | "activity" | "event";
const TABS: { id: Tab; label: string }[] = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "teams", label: "Teams" },
  { id: "missions", label: "Missions" },
  { id: "hints", label: "Hints" },
  { id: "activity", label: "Activity" },
  { id: "event", label: "Event control" },
];

/** Background poll on top of live updates, so a stale tab catches up. */
const POLL_MS = 15000;

/** Waits for the server to confirm control-room access before loading anything. */
export default function AdminPage() {
  const admin = useAdminSession();
  if (admin === "checking") {
    return (
      <CtfShell art="/assets/eligibility/lobby-panel.jpg" artPosition="center 30%" tone="dim" title="Control room" className="ctf--admin">
        <div className="ctf-loading" role="status">
          <span className="ctf-loading-bar" aria-hidden="true" />
          <p>Checking clearance…</p>
        </div>
      </CtfShell>
    );
  }
  if (!admin) return <Navigate to={CTF_PATHS.adminLogin} replace />;
  return <ControlRoom />;
}

function ControlRoom() {
  const navigate = useNavigate();
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [hintMission, setHintMission] = useState<string | null>(null);
  const { notify, toast } = useToast();

  const board = useLiveData(api.getLeaderboard);
  const missions = useLiveData(api.getMissionStats);
  const teams = useLiveData(api.getTeams);
  const hints = useLiveData(api.getAllHints);
  const event = useLiveData(api.getEvent);
  const activity = useLiveData(() => api.getActivity(300));
  const [updatedAt, setUpdatedAt] = useState(Date.now());

  useEffect(() => {
    if (board.data) setUpdatedAt(Date.now());
  }, [board.data]);

  const refreshAll = () => {
    void board.reload();
    void missions.reload();
    void teams.reload();
    void hints.reload();
    void event.reload();
    void activity.reload();
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      void board.reload();
      void missions.reload();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [board.reload, missions.reload]);

  const logout = async () => {
    await api.adminLogout();
    navigate(CTF_PATHS.adminLogin, { replace: true });
  };

  const rows = board.data ?? [];
  const ev = event.data;
  const status = !ev ? "Connecting" : ev.closed ? "Ended" : api.isLive(ev, now) ? "Live" : "Standby";
  const tiles = [
    { icon: Users, label: "Teams", value: rows.length },
    { icon: Play, label: "On the board", value: rows.filter((r) => r.solved > 0).length },
    { icon: Trophy, label: "Finished", value: rows.filter((r) => r.finished).length },
    { icon: Flag, label: "Flags captured", value: rows.reduce((s, r) => s + r.solved, 0) },
    { icon: MessageSquareText, label: "Hints sent", value: hints.data?.length ?? 0 },
  ];

  return (
    <CtfShell art="/assets/eligibility/lobby-panel.jpg" artPosition="center 30%" tone="dim" title="Control room" className="ctf--admin">
      <CtfHud label="Control room" onLogout={logout}>
        <HudStat label="Event" value={<span className={`ctf-pill is-${status.toLowerCase()}`}>{status}</span>} />
        <HudStat label="Updated" value={<span className="ctf-mono">{formatTime(updatedAt)}</span>} />
      </CtfHud>

      <main className="ctf-admin">
        <header className="ctf-admin-head">
          <div>
            <p className="ctf-kicker ctf-kicker--pink">DECODEX {EVENT.edition} // Virtual CTF</p>
            <h1>
              <TitleArt text="Control Room" size="page" />
            </h1>
          </div>
          <div className="ctf-admin-actions">
            <Link to={CTF_PATHS.leaderboard} className="ctf-btn ctf-btn--ghost">
              <MonitorPlay size={16} aria-hidden="true" />
              <span>Big screen</span>
            </Link>
            <button type="button" className={`ctf-btn ctf-btn--ghost${board.loading ? " is-spinning" : ""}`} onClick={refreshAll}>
              <RefreshCw size={16} aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <ul className="ctf-tiles">
          {tiles.map(({ icon: Icon, label, value }, i) => (
            <motion.li key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.45 }}>
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
              <b>{board.data ? value : "–"}</b>
            </motion.li>
          ))}
        </ul>

        <div className="ctf-tabs" role="tablist" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              className={tab === t.id ? "is-on" : ""}
              onClick={() => {
                setTab(t.id);
                if (t.id !== "hints") setHintMission(null);
              }}
            >
              {t.label}
              {tab === t.id && <motion.i layoutId="ctf-tab" className="ctf-tab-ink" />}
            </button>
          ))}
        </div>

        <section className="ctf-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "leaderboard" && <LeaderboardTab rows={rows} loading={!board.data} notify={notify} />}
          {tab === "teams" && (
            <TeamsTab teams={teams.data} board={rows} notify={notify} onRefresh={refreshAll} refreshing={teams.loading} />
          )}
          {tab === "missions" && (
            <MissionsTab
              stats={missions.data}
              teams={rows.length}
              notify={notify}
              onHint={(id) => {
                setHintMission(id);
                setTab("hints");
              }}
            />
          )}
          {tab === "hints" &&
            (missions.data && teams.data ? (
              <HintsTab hints={hints.data} missions={missions.data} teams={teams.data} notify={notify} presetMission={hintMission} />
            ) : (
              <p className="ctf-muted">Loading…</p>
            ))}
          {tab === "activity" && <ActivityTab entries={activity.data} />}
          {tab === "event" && (ev ?<EventTab event={ev} now={now} notify={notify} /> : <p className="ctf-muted">Loading event settings…</p>)}
        </section>
      </main>
      {toast}
    </CtfShell>
  );
}
