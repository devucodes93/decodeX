// Online qualifier results (22 Nov 2026). The CSV export is bundled into the
// site at build time via Vite's `?raw` import: no backend call at runtime.
// To update: replace the CSV file (keep the same columns) and the import below.
import csv from "./decodex-ctf-leaderboard-2026-11-22-06-32.csv?raw";

export const QUALIFIED_COUNT = 30;

export interface QualifierTeam {
  rank: number;
  team: string;
}

/** Splits one CSV line, honouring double-quoted fields and "" escapes. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parse(text: string): QualifierTeam[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rankCol = header.indexOf("rank");
  const teamCol = header.indexOf("team");
  const pointsCol = header.indexOf("points");
  return lines
    .slice(1)
    .map((line) => {
      const cells = parseLine(line);
      return {
        rank: Number(cells[rankCol]),
        team: (cells[teamCol] ?? "").trim(),
        points: Number(cells[pointsCol]) || 0,
      };
    })
    // Only teams that scored are listed.
    .filter((t) => t.team && Number.isFinite(t.rank) && t.points > 0)
    .map(({ rank, team }) => ({ rank, team }))
    .sort((a, b) => a.rank - b.rank);
}

export const QUALIFIERS: QualifierTeam[] = parse(csv);
