import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, X } from "lucide-react";
import * as api from "../api";
import type { PlayerHint } from "../api";
import { useLiveData } from "../hooks";

const seenKey = (teamId: string) => `decodex-ctf-seen-hints-${teamId}`;

function readSeen(teamId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(teamId)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(teamId: string, ids: Set<string>) {
  try {
    localStorage.setItem(seenKey(teamId), JSON.stringify([...ids]));
  } catch {
    /* per-viewer convenience only */
  }
}

export function hintLabel(h: PlayerHint) {
  if (h.target.kind === "mission") return `Mission ${String(h.missionOrder ?? 0).padStart(2, "0")}`;
  if (h.target.kind === "team") return "Your crew";
  return "All crews";
}

const ago = (at: number, now: number) => {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

/** Live hints for a team: list, unread count, and helpers. */
export function useTeamHints(teamId: string) {
  const { data } = useLiveData(() => api.getHints(), [teamId]);
  const hints = useMemo(() => data ?? [], [data]);
  const [seen, setSeen] = useState(() => readSeen(teamId));

  const markSeen = useCallback(
    (ids: string[]) => {
      setSeen((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        writeSeen(teamId, next);
        return next;
      });
    },
    [teamId],
  );

  const unread = hints.filter((h) => !seen.has(h.id));
  return { hints, unread, markSeen, loaded: data !== null };
}

/**
 * HUD "Intel" button with unread badge, a slide-in inbox, and a phone-style
 * popup when a new hint arrives from the control room.
 */
export function HintCenter({ teamId }: { teamId: string }) {
  const { hints, unread, markSeen, loaded } = useTeamHints(teamId);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<PlayerHint | null>(null);
  const toasted = useRef(new Set<string>());
  const closeRef = useRef<HTMLButtonElement>(null);
  const now = Date.now();

  // Pop the newest unread hint that hasn't been shown yet.
  useEffect(() => {
    if (!loaded || open) return;
    const fresh = unread.find((h) => !toasted.current.has(h.id));
    if (!fresh) return;
    unread.forEach((h) => toasted.current.add(h.id));
    setToast(fresh);
  }, [unread, loaded, open]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    markSeen(hints.map((h) => h.id));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hints, markSeen]);

  return (
    <>
      <button
        type="button"
        className={`ctf-hud-btn ctf-intel-btn${unread.length ? " has-unread" : ""}`}
        onClick={() => {
          setToast(null);
          setOpen(true);
        }}
        aria-label={unread.length ? `Intel, ${unread.length} new` : "Intel"}
      >
        <MessageSquareText size={15} aria-hidden="true" />
        <span>Intel</span>
        {unread.length > 0 && <b className="ctf-badge">{unread.length}</b>}
      </button>

      <AnimatePresence>
        {toast && (
          <motion.div
            className="ctf-phone"
            role="status"
            initial={{ opacity: 0, x: 60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <button
              type="button"
              className="ctf-phone-body"
              onClick={() => {
                setToast(null);
                setOpen(true);
              }}
            >
              <span className="ctf-phone-head">
                <span className="ctf-phone-avatar" aria-hidden="true">
                  CR
                </span>
                <span>
                  <b>Control Room</b>
                  <small>New intel · {hintLabel(toast)}</small>
                </span>
              </span>
              <span className="ctf-phone-msg">{toast.message}</span>
            </button>
            <button
              type="button"
              className="ctf-phone-x"
              aria-label="Dismiss"
              onClick={() => {
                markSeen([toast.id]);
                setToast(null);
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="ctf-drawer-scrim"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              className="ctf-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="intel-title"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
            >
              <div className="ctf-subbar">
                <span id="intel-title">Intel from control</span>
                <button ref={closeRef} type="button" className="ctf-icon-btn" onClick={() => setOpen(false)} aria-label="Close intel">
                  <X size={15} />
                </button>
              </div>
              {hints.length === 0 ? (
                <p className="ctf-drawer-empty">
                  No intel yet. Hints from the organisers show up here the moment they're sent.
                </p>
              ) : (
                <ol className="ctf-drawer-list">
                  {hints.map((h) => (
                    <li key={h.id}>
                      <div className="ctf-drawer-meta">
                        <span className={`ctf-tag ${h.target.kind === "mission" ? "ctf-tag--gold" : "ctf-tag--dark"}`}>{hintLabel(h)}</span>
                        <small>{ago(h.createdAt, now)}</small>
                      </div>
                      {h.missionTitle && <b className="ctf-drawer-mission">{h.missionTitle}</b>}
                      <p>{h.message}</p>
                    </li>
                  ))}
                </ol>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
