import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "../components/sections/Blocks";
import { EVENT, SHOW_RESULTS } from "../config/event";
import { useTitle } from "../hooks";
import type { ResultEntry } from "../types";

export default function ResultsPage() {
  useTitle(`Results | ${EVENT.name}`);
  const [rows, setRows] = useState<ResultEntry[] | null>(null);

  // Results data is loaded lazily and only when publication is enabled.
  useEffect(() => {
    if (!SHOW_RESULTS) {
      setRows([]);
      return;
    }
    let cancelled = false;
    import("../data/results").then((module) => {
      if (!cancelled) setRows(module.RESULTS);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!SHOW_RESULTS) return <Navigate to="/" replace />;
  if (!rows || rows.length === 0) return null;

  return (
    <>
      <PageHeader
        kicker="DECODEX / RESULTS"
        title="Results"
        intro="Verified results from the Signal Processing CTF Challenge will be published here when available."
      />
      <section className="sec light">
        <div className="wrap narrow">
          <ol className="results">
            {rows.map((row, index) => (
              <li key={row.team}>
                <b>{row.rank ?? index + 1}</b>
                <div>
                  <h3>{row.team}</h3>
                  <p>{[row.college, row.project].filter(Boolean).join("\u00B7")}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="note">
            Results are published only after verification by the organizers. Contact the organizing
            committee if you believe any information is incorrect.
          </p>
        </div>
      </section>
    </>
  );
}
