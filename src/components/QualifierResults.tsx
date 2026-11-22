import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Search, Star, Trophy, X } from "lucide-react";
import { QUALIFIED_COUNT, QUALIFIERS, type QualifierTeam } from "../data/qualifiers";
import { EVENT } from "../config/event";
import { ASSETS } from "../config/assets";
import "./QualifierResults.css";

const ease = [0.22, 1, 0.36, 1] as const;
const pad = (n: number) => String(n).padStart(2, "0");
const MEDALS = ["gold", "silver", "bronze"] as const;

function Row({ t, qualified }: { t: QualifierTeam; qualified: boolean }) {
  const medal = t.rank <= 3 ? MEDALS[t.rank - 1] : "";
  return (
    <li className={`qr-row${qualified ? " is-in" : ""}${medal ? ` is-${medal}` : ""}`}>
      <span className="qr-rank">#{pad(t.rank)}</span>
      <span className="qr-name">{t.team}</span>
      {qualified && <span className="qr-tag">Qualified</span>}
    </li>
  );
}

function Podium({ teams }: { teams: QualifierTeam[] }) {
  // Visual order: 2nd, 1st, 3rd.
  const order = [teams[1], teams[0], teams[2]].filter(Boolean);
  return (
    <div className="qr-podium">
      {order.map((t, i) => {
        const medal = MEDALS[t.rank - 1];
        return (
          <motion.div
            key={t.rank}
            className={`qr-pod is-${medal}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + [0.15, 0, 0.3][i], duration: 0.5, ease }}
          >
            {t.rank === 1 && <Crown className="qr-pod-crown" size={26} aria-hidden />}
            <span className="qr-pod-rank">#{t.rank}</span>
            <span className="qr-pod-name">{t.team}</span>
            <span className="qr-pod-base" aria-hidden />
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * Online qualifier results popup for the home page. Opens every time the
 * home page loads (once the intro animation has finished) and can be
 * reopened from the floating "Results Out" button.
 */
export function QualifierResults() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Auto-open after the intro overlay has gone.
  useEffect(() => {
    let openTimer: number | undefined;
    const poll = window.setInterval(() => {
      if (document.querySelector(".intro")) return;
      window.clearInterval(poll);
      openTimer = window.setTimeout(() => setOpen(true), 400);
    }, 150);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(openTimer);
    };
  }, []);

  // While open: lock page scroll, close on Escape, focus the close button.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const focus = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 60);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focus);
      setQuery("");
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const { top3, qualified, others } = useMemo(() => {
    const match = (t: QualifierTeam) => !q || t.team.toLowerCase().includes(q);
    const inTop = QUALIFIERS.filter((t) => t.rank <= QUALIFIED_COUNT);
    return {
      top3: inTop.slice(0, 3),
      // With no search, ranks 1-3 sit on the podium; with a search, everything is a row.
      qualified: inTop.filter((t) => match(t) && (q || t.rank > 3)),
      others: QUALIFIERS.filter((t) => t.rank > QUALIFIED_COUNT && match(t)),
    };
  }, [q]);
  const othersTotal = QUALIFIERS.length - Math.min(QUALIFIED_COUNT, QUALIFIERS.length);
  const nothing = q && qualified.length === 0 && others.length === 0;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={triggerRef}
            type="button"
            className="qr-fab"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease }}
          >
            <Trophy size={18} aria-hidden />
            <span>Results Out</span>
            <span className="qr-fab-dot" aria-hidden />
          </motion.button>
        )}
      </AnimatePresence>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="qr-backdrop"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="qr-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="qr-title"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, y: 60, rotate: -1.5 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                exit={{ opacity: 0, y: 40, scale: 0.97 }}
                transition={{ duration: 0.5, ease }}
              >
                <button ref={closeRef} type="button" className="qr-close" onClick={() => setOpen(false)} aria-label="Close results">
                  <X size={20} strokeWidth={3} />
                </button>

                <div className="qr-scroll">
                  {/* ---------- cinematic banner ---------- */}
                  <header className="qr-hero" style={{ backgroundImage: `url(${ASSETS.gtaCity})` }}>
                    <span className="qr-hero-shade" aria-hidden />
                    <span className="qr-scan" aria-hidden />

                    <motion.span
                      className="qr-sticker"
                      initial={{ opacity: 0, y: -12, rotate: -10 }}
                      animate={{ opacity: 1, y: 0, rotate: -3 }}
                      transition={{ delay: 0.25, duration: 0.4, ease }}
                    >
                      Online Qualifier · {EVENT.qualifierDate}
                    </motion.span>

                    <motion.h2
                      id="qr-title"
                      className="qr-title"
                      initial={{ opacity: 0, scale: 2.4 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 18 }}
                    >
                      Mission Passed
                    </motion.h2>

                    <div className="qr-stars" aria-label="Five stars">
                      {Array.from({ length: 5 }, (_, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0, rotate: -90 }}
                          animate={{ opacity: 1, scale: 1, rotate: 0 }}
                          transition={{ delay: 0.65 + i * 0.08, type: "spring", stiffness: 400, damping: 14 }}
                        >
                          <Star size={22} fill="currentColor" strokeWidth={1.5} />
                        </motion.span>
                      ))}
                    </div>

                    <motion.p
                      className="qr-banner"
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.75, duration: 0.45, ease }}
                    >
                      Top <b>{QUALIFIED_COUNT}</b> Teams Selected
                    </motion.p>
                    <p className="qr-hero-sub">
                      Advancing to the {EVENT.duration} · {EVENT.offlineDate}
                    </p>
                  </header>

                  <div className="qr-content">
                    {/* ---------- phone message ---------- */}
                    <motion.div
                      className="qr-msg"
                      role="note"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.1, duration: 0.5, ease }}
                    >
                      <span className="qr-msg-avatar" aria-hidden>HQ</span>
                      <div className="qr-msg-body">
                        <span className="qr-msg-from">
                          {EVENT.name} HQ <i>· new message</i>
                        </span>
                        <p>
                          Selected teams will be <strong>contacted soon</strong> for the further procedure. Stay tuned.
                        </p>
                      </div>
                    </motion.div>

                    {/* ---------- search ---------- */}
                    <label className="qr-search">
                      <Search size={17} aria-hidden />
                      <input
                        type="search"
                        placeholder="Find your team…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search teams"
                      />
                    </label>

                    {/* ---------- selected ---------- */}
                    {(!q || qualified.length > 0) && (
                      <section aria-labelledby="qr-sel">
                        <h3 id="qr-sel" className="qr-head">
                          <span className="qr-head-label">Selected Teams</span>
                          <span className="qr-head-line" aria-hidden />
                          <span className="qr-head-count">{QUALIFIED_COUNT}</span>
                        </h3>
                        {!q && <Podium teams={top3} />}
                        <ol className="qr-list">
                          {qualified.map((t) => (
                            <Row key={t.rank} t={t} qualified />
                          ))}
                        </ol>
                      </section>
                    )}

                    {/* ---------- other teams ---------- */}
                    {others.length > 0 && (
                      <section aria-labelledby="qr-oth" className="qr-others">
                        <h3 id="qr-oth" className="qr-head qr-head--muted">
                          <span className="qr-head-label">Other Rankings</span>
                          <span className="qr-head-line" aria-hidden />
                          <span className="qr-head-count">{othersTotal}</span>
                        </h3>
                        <ol className="qr-list qr-list--others">
                          {others.map((t) => (
                            <Row key={t.rank} t={t} qualified={false} />
                          ))}
                        </ol>
                      </section>
                    )}

                    {nothing && <p className="qr-empty">No team matches “{query}”.</p>}

                    <p className="qr-foot">Thank you to every team who took part in the qualifier.</p>
                  </div>
                </div>

                {/* ---------- action bar ---------- */}
                <div className="qr-actions">
                  <button type="button" className="qr-continue" onClick={() => setOpen(false)}>
                    Continue
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
