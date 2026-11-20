import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Search } from "lucide-react";
import type { LeaderboardRow } from "../api";
import { formatDuration, formatTime } from "../hooks";
import { downloadCsv } from "./ui";

/** Live standings. Only organisers ever see this. */
export function LeaderboardTab({ rows, loading }: { rows: LeaderboardRow[]; loading: boolean }) {
  const [q, setQ] = useState("");
  const ranked = useMemo(() => rows.map((r, i) => ({ ...r, rank: i + 1 })), [rows]);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ranked;
    return ranked.filter((r) => [r.teamName, r.teamId, r.institution].some((v) => v.toLowerCase().includes(term)));
  }, [ranked, q]);

  const exportCsv = () =>
    downloadCsv(
      "decodex-ctf-leaderboard",
      ["Rank", "Team", "Team ID", "Institution", "Points", "Flags", "Since event start", "Last flag"],
      ranked.map((r) => [
        r.rank,
        r.teamName,
        r.teamId,
        r.institution,
        r.score,
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
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
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
                  </td>
                  <td className="is-num ctf-mono">{formatDuration(r.timeTakenMs)}</td>
                  <td className="is-num is-hide-sm ctf-mono ctf-muted">{formatTime(r.lastSolveAt)}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {!loading && shown.length === 0 && (
              <tr>
                <td colSpan={7} className="ctf-empty">
                  {rows.length ? `No teams match “${q}”.` : "No teams on the board yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="ctf-muted ctf-small">Ranked by points. Teams with the same points are ranked by who scored their last flag first, in real time. "Since start" counts from the event start. Only organisers can see this board.</p>
    </>
  );
}
