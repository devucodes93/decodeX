import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Trash2 } from "lucide-react";
import * as api from "../api";
import type { Hint, HintTarget, MissionStat, TeamRecord } from "../api";
import { Confirm, type Notify } from "./ui";

const MAX = 280;

type Audience = HintTarget["kind"];

export function HintsTab({
  hints,
  missions,
  teams,
  notify,
  presetMission,
}: {
  hints: Hint[] | null;
  missions: MissionStat[];
  teams: TeamRecord[];
  notify: Notify;
  /** Mission picked from the Missions tab's hint button. */
  presetMission: string | null;
}) {
  const [audience, setAudience] = useState<Audience>(presetMission ? "mission" : "all");
  const [missionId, setMissionId] = useState(presetMission ?? missions[0]?.id ?? "");
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Hint | null>(null);

  useEffect(() => {
    if (presetMission) {
      setAudience("mission");
      setMissionId(presetMission);
    }
  }, [presetMission]);

  // Keep selections valid when missions / teams change.
  useEffect(() => {
    if (!missions.some((m) => m.id === missionId)) setMissionId(missions[0]?.id ?? "");
  }, [missions, missionId]);
  useEffect(() => {
    if (!teams.some((t) => t.id === teamId)) setTeamId(teams[0]?.id ?? "");
  }, [teams, teamId]);

  const missionLabel = (id: string) => {
    const i = missions.findIndex((m) => m.id === id);
    return i < 0 ? "Deleted mission" : `Mission ${String(i + 1).padStart(2, "0")} · ${missions[i].title}`;
  };
  const teamLabel = (id: string) => {
    const t = teams.find((x) => x.id === id);
    return t ? `${t.name} (${t.id})` : id;
  };
  const targetLabel = (t: HintTarget) =>
    t.kind === "all" ? "All teams" : t.kind === "mission" ? missionLabel(t.missionId) : teamLabel(t.teamId);

  const target: HintTarget | null =
    audience === "all"
      ? { kind: "all" }
      : audience === "mission"
        ? missionId
          ? { kind: "mission", missionId }
          : null
        : teamId
          ? { kind: "team", teamId }
          : null;

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await api.sendHint(message, target);
      setMessage("");
      notify(`Hint sent to ${audience === "all" ? "every team" : targetLabel(target)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the hint.");
    } finally {
      setBusy(false);
    }
  };

  const reachNote =
    audience === "all"
      ? "Every team gets it straight away, before or during the event."
      : audience === "mission"
        ? "Teams on this mission get it now. Teams that haven't reached it yet see it when they unlock it."
        : "Only this team sees it.";

  return (
    <div className="ctf-hints">
      <form className="ctf-card ctf-hint-compose" onSubmit={send}>
        <header>
          <Send size={18} aria-hidden="true" />
          <h2>Send a hint</h2>
        </header>

        <div className="ctf-seg" role="radiogroup" aria-label="Who gets this hint">
          {(
            [
              ["all", "Everyone"],
              ["mission", "A mission"],
              ["team", "One team"],
            ] as [Audience, string][]
          ).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={audience === k} className={audience === k ? "is-on" : ""} onClick={() => setAudience(k)}>
              {label}
            </button>
          ))}
        </div>

        {audience === "mission" && (
          <label className="ctf-field">
            <span>Mission</span>
            <select value={missionId} onChange={(e) => setMissionId(e.target.value)} disabled={!missions.length}>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {missionLabel(m.id)}
                </option>
              ))}
            </select>
          </label>
        )}
        {audience === "team" && (
          <label className="ctf-field">
            <span>Team</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} disabled={!teams.length}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {teamLabel(t.id)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="ctf-field">
          <span>
            Hint <small className="ctf-counter">{message.length}/{MAX}</small>
          </span>
          <textarea
            rows={4}
            maxLength={MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Try looking at the audio above 15 kHz."
          />
        </label>
        <p className="ctf-muted ctf-small">{reachNote}</p>

        {error && (
          <p className="ctf-alert" role="alert">
            <span>{error}</span>
          </p>
        )}

        <div className="ctf-card-actions">
          <button type="submit" className={`ctf-btn ctf-btn--gold${busy ? " is-busy" : ""}`} disabled={busy || !message.trim() || !target}>
            <Send size={15} aria-hidden="true" />
            <span>{busy ? "Sending…" : "Send hint"}</span>
          </button>
        </div>
      </form>

      <div className="ctf-hint-side">
        <div className="ctf-hint-preview" aria-hidden="true">
          <span className="ctf-field-label">What players see</span>
          <div className="ctf-phone ctf-phone--static">
            <div className="ctf-phone-body">
              <span className="ctf-phone-head">
                <span className="ctf-phone-avatar">CR</span>
                <span>
                  <b>Control Room</b>
                  <small>
                    New intel ·{" "}
                    {audience === "all"
                      ? "All crews"
                      : audience === "team"
                        ? "Your crew"
                        : `Mission ${String(missions.findIndex((m) => m.id === missionId) + 1).padStart(2, "0")}`}
                  </small>
                </span>
              </span>
              <span className="ctf-phone-msg">{message.trim() || "Your hint shows up here."}</span>
            </div>
          </div>
        </div>

        <section className="ctf-card ctf-card--quiet ctf-hint-log" aria-labelledby="sent-title">
          <header>
            <h2 id="sent-title">Sent hints</h2>
            <span className="ctf-pill">{hints?.length ?? 0}</span>
          </header>
          {!hints?.length ? (
            <p className="ctf-muted ctf-small">Nothing sent yet.</p>
          ) : (
            <ol>
              <AnimatePresence initial={false}>
                {hints.map((h) => (
                  <motion.li key={h.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                    <div className="ctf-hint-log-meta">
                      <span className={`ctf-tag ${h.target.kind === "mission" ? "ctf-tag--gold" : h.target.kind === "team" ? "" : "ctf-tag--dark"}`}>
                        {targetLabel(h.target)}
                      </span>
                      <small className="ctf-muted">
                        {new Date(h.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </small>
                      <button type="button" className="ctf-icon-btn is-danger" onClick={() => setRemoving(h)} aria-label="Delete hint">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p>{h.message}</p>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </section>
      </div>

      <Confirm
        open={Boolean(removing)}
        title="Delete this hint?"
        body="It disappears from every team's Intel inbox. Teams who already read it will still remember it."
        confirmLabel="Delete hint"
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await api.deleteHint(removing.id);
            notify("Hint deleted.");
            setRemoving(null);
          } catch (e) {
            notify(e instanceof Error ? e.message : "Couldn't delete the hint.", "error");
          }
        }}
      />
    </div>
  );
}
