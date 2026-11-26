import { useEffect, useState, type ReactNode } from "react";
import MaintenancePage from "../pages/MaintenancePage";
import { MAINTENANCE } from "../config/event";

/*
 * Maintenance mode, switched from the control room (Event control ->
 * Website maintenance). Used by the public website (PublicGate) and the
 * player CTF pages (/ctf/login, /ctf, /ctf/play). The control room and the
 * live leaderboard are never gated.
 *
 * One small request to the public `ctf_site_status` function (no Supabase
 * library needed). If it can't be reached, or the migration hasn't been run,
 * pages show as normal, so a backend problem never locks everyone out.
 */

const URL_ = import.meta.env.VITE_SUPABASE_URL?.trim();
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
/** Re-check while a tab stays open, so it switches without a reload. */
const RECHECK_MS = 60_000;

async function fetchMaintenance(): Promise<boolean> {
  if (!URL_ || !KEY) return false;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/ctf_site_status`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: "{}",
      signal: ctrl.signal,
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { maintenance?: unknown } | null;
    return data?.maintenance === true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

/** true / false, or null until the first check has answered. */
export function useMaintenance(): boolean | null {
  const [on, setOn] = useState<boolean | null>(MAINTENANCE ? true : null);
  useEffect(() => {
    if (MAINTENANCE) return;
    let alive = true;
    const check = (force = false) => {
      if (!force && document.visibilityState !== "visible") return;
      void fetchMaintenance().then((v) => alive && setOn(v));
    };
    check(true);
    const id = window.setInterval(check, RECHECK_MS);
    const onVisible = () => check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return on;
}

/**
 * Shows the maintenance page instead of `children` while maintenance is on.
 * `wait`: render nothing until the first check answers (player pages, so a
 * mission never flashes up before the maintenance page).
 */
export function MaintenanceGate({ children, wait = false }: { children: ReactNode; wait?: boolean }) {
  const on = useMaintenance();
  if (on) return <MaintenancePage />;
  if (on === null && wait) return <div style={{ minHeight: "100vh", background: "#0d0b0c" }} aria-busy="true" />;
  return <>{children}</>;
}
