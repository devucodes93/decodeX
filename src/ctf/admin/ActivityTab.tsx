import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import type { ActivityEntry } from "../api";
import { downloadCsv } from "./ui";

const KINDS: Record<ActivityEntry["kind"], { label: string; tone: string }> = {
  flag_correct: { label: "Flag captured", tone: "is-green" },
  flag_wrong: { label: "Wrong flag", tone: "is-muted" },
  flag_practice: { label: "Practice flag", tone: "is-gold" },
  rate_limited: { label: "Rate limited", tone: "is-red" },
  login: { label: "Signed in", tone: "is-muted" },
  login_failed: { label: "Wrong password", tone: "is-gold" },
  login_locked: { label: "Login locked", tone: "is-red" },
  admin: { label: "Admin change", tone: "is-pink" },
};

const FILTERS: { id: string; label: string; kinds: ActivityEntry["kind"][] | null }[] = [
  { id: "all", label: "All", kinds: null },
  { id: "flags", label: "Flags", kinds: ["flag_correct", "flag_wrong", "flag_practice"] },
  { id: "alerts", label: "Alerts", kinds: ["rate_limited", "login_failed", "login_locked"] },
  { id: "logins", label: "Logins", kinds: ["login", "login_failed", "login_locked"] },
  { id: "admin", label: "Admin", kinds: ["admin"] },
];

const time = (at: number) =>
  new Date(at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

/**
 * Everything that changed scores or settings, and every sign-in, so
 * organisers can see exactly what happened and when. Read-only: nobody,
 * including admins, can edit or delete entries.
 */
export function ActivityTab({ entries }: { entries: ActivityEntry[] | null }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const shown = useMemo(() => {
    const kinds = FILTERS.find((f) => f.id === filter)?.kinds;
    const term = q.trim().toLowerCase();
    return (entries ?? []).filter(
      (e) =>
        (!kinds || kinds.includes(e.kind)) &&
        (!term || [e.teamId, e.teamName, e.missionTitle, e.ip, e.detail].some((v) => v?.toLowerCase().includes(term))),
    );
  }, [entries, filter, q]);

  const alerts = (entries ?? []).filter((e) => e.kind === "rate_limited" || e.kind === "login_locked").length;

  return (
    <>
      <div className="ctf-toolbar">
        <div className="ctf-seg ctf-seg--auto" role="radiogroup" aria-label="Filter activity">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={filter === f.id} className={filter === f.id ? "is-on" : ""} onClick={() => setFilter(f.id)}>
              {f.label}
              {f.id === "alerts" && alerts > 0 && <b className="ctf-badge">{alerts}</b>}
            </button>
          ))}
        </div>
        <label className="ctf-search">
          <Search size={16} aria-hidden="true" />
          <span className="ctf-sr">Search activity</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Team, mission, IP…" />
        </label>
        <button
          type="button"
          className="ctf-btn ctf-btn--ghost"
          disabled={!shown.length}
          onClick={() =>
            downloadCsv(
              "decodex-ctf-activity",
              ["Time", "Event", "Team ID", "Team", "Mission", "IP", "Detail"],
              shown.map((e) => [new Date(e.at).toISOString(), KINDS[e.kind].label, e.teamId ?? "", e.teamName ?? "", e.missionTitle ?? "", e.ip, e.detail]),
            )
          }
        >
          <Download size={16} aria-hidden="true" />
          <span>Export</span>
        </button>
      </div>

      <div className="ctf-table-wrap">
        <table className="ctf-table ctf-activity">
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Event</th>
              <th scope="col">Team</th>
              <th scope="col" className="is-hide-sm">Mission / detail</th>
              <th scope="col" className="is-hide-sm">IP</th>
            </tr>
          </thead>
          <tbody>
            {!entries &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <span className="ctf-skeleton" />
                  </td>
                </tr>
              ))}
            {shown.map((e) => (
              <tr key={e.id}>
                <td className="ctf-mono ctf-muted">{time(e.at)}</td>
                <td>
                  <span className={`ctf-kind ${KINDS[e.kind].tone}`}>{KINDS[e.kind].label}</span>
                </td>
                <td>
                  {e.teamId ? (
                    <>
                      <b className="ctf-team">{e.teamName ?? "Unknown team"}</b>
                      <small className="ctf-team-id">{e.teamId}</small>
                    </>
                  ) : (
                    <span className="ctf-muted">—</span>
                  )}
                </td>
                <td className="is-hide-sm">
                  {e.missionTitle && <b className="ctf-activity-mission">{e.missionTitle}</b>}
                  {e.detail && <span className="ctf-activity-detail">{e.detail}</span>}
                </td>
                <td className="is-hide-sm ctf-mono ctf-muted">{e.ip || "—"}</td>
              </tr>
            ))}
            {entries && shown.length === 0 && (
              <tr>
                <td colSpan={5} className="ctf-empty">
                  Nothing here yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="ctf-muted ctf-small">
        Newest first, last 300 events. The log can't be edited or deleted, by anyone. Submitted flag text is never stored.
      </p>
    </>
  );
}
