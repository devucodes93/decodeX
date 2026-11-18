import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_EXPIRED_EVENT, getAdminSession, subscribe, type AdminSession } from "./api";

/** The signed-in organiser: "checking" while the server confirms access. */
export function useAdminSession() {
  const [state, setState] = useState<AdminSession | null | "checking">("checking");
  useEffect(() => {
    let alive = true;
    getAdminSession()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Runs `onExpired` when the server ends this team's session. */
export function useOnSessionExpired(onExpired: () => void) {
  const cb = useRef(onExpired);
  cb.current = onExpired;
  useEffect(() => {
    const f = () => cb.current();
    window.addEventListener(SESSION_EXPIRED_EVENT, f);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, f);
  }, []);
}

/** Keeps the hidden CTF pages out of search engines while mounted. */
export function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

/**
 * Loads data and reloads it whenever the CTF data changes (live updates).
 * `loader` must be stable or listed in `deps`.
 */
export function useLiveData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const value = await load();
      if (id === seq.current) {
        setData(value);
        setError(null);
      }
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void reload();
    return subscribe(() => void reload());
  }, [reload]);

  return { data, error, loading, reload };
}

/** Current time, refreshed every `ms`. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 1h 04m 09s / 04m 09s */
export function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined || ms < 0) return "--";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${pad(m)}m ${pad(s % 60)}s` : `${pad(m)}m ${pad(s % 60)}s`;
}

/** 01:04:09 clock for the HUD. */
export function formatClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function splitCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return [
    { label: "Days", value: pad(Math.floor(s / 86400)) },
    { label: "Hours", value: pad(Math.floor((s % 86400) / 3600)) },
    { label: "Mins", value: pad(Math.floor((s % 3600) / 60)) },
    { label: "Secs", value: pad(s % 60) },
  ];
}

export function formatTime(at: number | null) {
  if (!at) return "--";
  return new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
