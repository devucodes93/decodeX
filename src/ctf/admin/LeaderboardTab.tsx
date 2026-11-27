import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Gavel, Search } from "lucide-react";
import * as api from "../api";
import type { LeaderboardRow } from "../api";
import { formatDuration, formatTime } from "../hooks";
import { Modal, downloadCsv, type Notify } from "./ui";

/** Live standings. Only organisers ever see this. */
export function LeaderboardTab({ rows, loading, notify }: { rows: LeaderboardRow[]; loading: boolean; notify: Notify }) {
  const [q, setQ] = useState("");
  const [penaltyFor, setPenaltyFor] = useState<LeaderboardRow | null>(null);
  const ranked = useMemo(() => rows.map((r, i) => ({ ...r, rank: i + 1 })), [rows]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ranked;
    return ranked.filter((r) => [r.teamName, r.teamId, r.institution].some((v) => v.toLowerCase().includes(term)));
  }, [ranked, q]);

  const exportCsv = () =>
    downloadCsv(
      "decodex-ctf-leaderboard",
      ["Rank", "Team", "Team ID", "Institution", "Points", "Penalty", "Flags", "Since event start", "Last flag"],
      ranked.map((r) => [
        r.rank,
        r.teamName,
        r.teamId,
        r.institution,
        r.score,
        r.penalty ? -r.penalty : 0,
        `${r.solved}/${r.total}`,
        formatDuration(r.timeTakenMs),
        r.lastSolveAt ? new Date(r.lastSolveAt).toISOString() : "",
      ]),
    );

  return (
    <>
      <div className="ctf-toolbar">
        <label className="ctf-search">
          <Search size={16} aria-hidden="true" />
          <span className="ctf-sr">Search teams</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search team, ID or college" />
        </label>
        <span className="ctf-live-chip">
          <span className="ctf-live-dot" aria-hidden="true" /> Live
        </span>
        <button type="button" className="ctf-btn ctf-btn--ghost" onClick={exportCsv} disabled={!rows.length}>
          <Download size={16} aria-hidden="true" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="ctf-table-wrap">
        <table className="ctf-table">
          <thead>
            <tr>
              <th scope="col" className="is-rank">#</th>
              <th scope="col">Team</th>
              <th scope="col" className="is-hide-sm">Institution</th>
              <th scope="col">Flags</th>
              <th scope="col" className="is-num">Points</th>
              <th scope="col" className="is-num">Since start</th>
              <th scope="col" className="is-num is-hide-sm">Last flag</th>
              <th scope="col" className="is-num">
                <span className="ctf-sr">Penalty</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={8}>
                    <span className="ctf-skeleton" />
                  </td>
                </tr>
              ))}
            <AnimatePresence initial={false}>
              {shown.map((r) => (
                <motion.tr key={r.teamId} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td className="is-rank">
                    <span className={`ctf-rank${r.rank <= 3 && r.score > 0 ? ` is-${r.rank}` : ""}`}>{r.rank}</span>
                  </td>
                  <td>
                    <b className="ctf-team">{r.teamName}</b>
                    <small className="ctf-team-id">{r.teamId}</small>
                  </td>
                  <td className="is-hide-sm ctf-muted">{r.institution}</td>
                  <td>
                    <span className="ctf-meter" aria-label={`${r.solved} of ${r.total}`}>
                      <span className="ctf-meter-bar">
                        <i style={{ width: `${r.total ? (r.solved / r.total) * 100 : 0}%` }} />
                      </span>
                      <span className="ctf-mono">
                        {r.solved}/{r.total}
                      </span>
                    </span>
                  </td>
                  <td className="is-num">
                    <b className="ctf-points">{r.score.toLocaleString("en-IN")}</b>
                    {r.penalty ? (
                      <small className="ctf-penalty" title={r.penaltyNote || "Penalty"}>
                        −{r.penalty.toLocaleString("en-IN")} penalty
                      </small>
                    ) : null}
                  </td>
                  <td className="is-num ctf-mono">{formatDuration(r.timeTakenMs)}</td>
                  <td className="is-num is-hide-sm ctf-mono ctf-muted">{formatTime(r.lastSolveAt)}</td>
                  <td className="is-num">
                    <button
                      type="button"
                      className={`ctf-penalty-btn${r.penalty ? " is-on" : ""}`}
                      onClick={() => setPenaltyFor(r)}
                      title={r.penalty ? "Change or remove the penalty" : "Give a penalty"}
                    >
                      <Gavel size={14} aria-hidden="true" />
                      <span>{r.penalty ? "Edit" : "Penalty"}</span>
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={8} className="ctf-empty">
                  {rows.length ? `No teams match “${q}”.` : "No teams on the board yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <PenaltyDialog row={penaltyFor} onClose={() => setPenaltyFor(null)} notify={notify} />
      <p className="ctf-muted ctf-small">Ranked by points (after any penalty). Teams with the same points are ranked by who scored their last flag first, in real time. "Since start" counts from the event start. Only organisers can see this board.</p>
    </>
  );
}

/** Give, change or remove a team's point penalty. */
function PenaltyDialog({ row, onClose, notify }: { row: LeaderboardRow | null; onClose: () => void; notify: Notify }) {
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setPoints(row.penalty ? String(row.penalty) : "");
    setNote(row.penaltyNote || "");
    setError(null);
  }, [row]);

  const save = async (value: number) => {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await api.setPenalty(row.teamId, value, value ? note : "");
      notify(value ? `${row.teamName}: −${value} point penalty set.` : `${row.teamName}: penalty removed.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const n = Number(points);
  const valid = points.trim() !== "" && Number.isFinite(n) && n >= 0 && Number.isInteger(n);
  const current = row?.penalty ?? 0;
  const before = row ? row.score + current : 0;

  return (
    <Modal open={row !== null} onClose={busy ? () => undefined : onClose} title={row ? `Penalty · ${row.teamName}` : "Penalty"} tone="red">
      {row && (
        <form
          className="ctf-penalty-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) void save(n);
          }}
        >
          <p className="ctf-muted ctf-modal-text">
            Points are taken off this team's score. Their flags still count, and new flags add points as normal. Shown on every
            leaderboard and on the team's own screen; recorded in Activity.
          </p>

          <label className="ctf-field">
            <span>Points to take off</span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="e.g. 100"
              autoFocus
            />
          </label>
          <label className="ctf-field">
            <span>Reason (organisers only)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Shared flags with another team" />
          </label>

          {valid && (
            <p className="ctf-penalty-preview">
              Score: {before.toLocaleString("en-IN")} − {n.toLocaleString("en-IN")} ={" "}
              <b>{(before - n).toLocaleString("en-IN")}</b> pts
            </p>
          )}
          {error && <p className="ctf-form-error" role="alert">{error}</p>}

          <div className="ctf-modal-actions ctf-modal-actions--row">
            <button type="submit" className={`ctf-btn ctf-btn--danger${busy ? " is-busy" : ""}`} disabled={!valid || busy}>
              {busy ? "Saving…" : current ? "Update penalty" : "Give penalty"}
            </button>
            {current > 0 && (
              <button type="button" className="ctf-btn ctf-btn--ghost" disabled={busy} onClick={() => void save(0)}>
                Remove penalty
              </button>
            )}
            <button type="button" className="ctf-btn ctf-btn--ghost" disabled={busy} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
