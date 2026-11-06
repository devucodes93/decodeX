import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../animations/gsap";
import { FeatureIcon, type FeatureIconType } from "./ui/FeatureIcon";
import "./MissionLobby.css";

export type LobbyItem = {
  label: string;
  /** Short value shown in the menu row. */
  short: string;
  /** Full value shown in the preview. Newlines become separate lines. */
  value: string;
  /** Small in-game style subtitle, e.g. "Crew size". */
  tag: string;
  icon: FeatureIconType;
};

/** One artwork for the whole preview, and the menu header banner. */
const PANEL_IMAGE = "/assets/eligibility/lobby-panel.jpg";
const BANNER_IMAGE = "/assets/eligibility/lobby-banner.jpg";

const WIDE = "(min-width: 900px)";

function useIsWide() {
  const [wide, setWide] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia(WIDE).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hoverCapable = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg className="lb-chev" viewBox="0 0 8 12" aria-hidden="true">
    <path d={dir === "left" ? "M6.5 1 1.5 6l5 5" : "M1.5 1l5 5-5 5"} fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

/**
 * Eligibility & event format as an in-game job lobby: a menu (artwork
 * banner, sub-bar with a position counter, rows with the selected one
 * inverted) next to a large preview that changes with the selection.
 * Desktop: hover / click / arrow keys. Phones: tap — the selected row
 * expands in place with its artwork.
 */
export function MissionLobby({ items }: { items: LobbyItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [sel, setSel] = useState(0);
  const wide = useIsWide();
  const current = items[sel];

  // Entrance on scroll: rows slide in, preview wipes open.
  useGSAP(
    () => {
      if (reduced()) return;
      const root = rootRef.current;
      if (!root) return;
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 78%", once: true },
        defaults: { ease: "power3.out" },
      });
      tl.from(".lb-banner, .lb-subbar", { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 })
        .from(".lb-row", { x: -26, opacity: 0, duration: 0.45, stagger: 0.06 }, "-=0.25");
      if (root.querySelector(".lb-panel")) {
        tl.fromTo(
          ".lb-panel",
          { clipPath: "inset(0% 100% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power4.inOut", clearProps: "clipPath" },
          0.15,
        );
      }
    },
    { scope: rootRef, dependencies: [wide], revertOnUpdate: true },
  );

  // Preview change: the artwork stays exactly as it is; only the text
  // content changes, sliding in.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !wide || reduced()) return;
    const text = root.querySelectorAll<HTMLElement>(".lb-panel-text > *");
    gsap.fromTo(text, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power3.out", overwrite: true });
  }, [sel, wide]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowDown: (sel + 1) % items.length,
      ArrowUp: (sel - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = keys[e.key];
    setSel(next);
    tabRefs.current[next]?.focus();
  };

  const num = (i: number) => String(i + 1).padStart(2, "0");
  const lines = (v: string) => v.split("\n").map((l) => l.replace(/^\s*•\s*/, "").trim()).filter(Boolean);

  return (
    <div className={`lobby${wide ? " lobby--wide" : ""}`} ref={rootRef}>
      {/* ---------- Menu ---------- */}
      <div className="lb-menu">
        <div className="lb-banner">
          <img src={BANNER_IMAGE} alt="" aria-hidden="true" loading="lazy" />
        </div>

        <div className="lb-subbar">
          <span>Event format</span>
          <span aria-hidden="true">
            {sel + 1}/{items.length}
          </span>
        </div>

        <div
          className="lb-rows"
          role={wide ? "tablist" : undefined}
          aria-orientation={wide ? "vertical" : undefined}
          aria-label="Eligibility and event format"
          onKeyDown={onKeyDown}
        >
          {items.map((item, i) => {
            const active = i === sel;
            return (
              <div className="lb-row-wrap" key={item.label}>
                <button
                  type="button"
                  ref={(el) => (tabRefs.current[i] = el)}
                  className={`lb-row${active ? " is-active" : ""}`}
                  id={`lb-tab-${i}`}
                  role={wide ? "tab" : undefined}
                  aria-selected={wide ? active : undefined}
                  aria-controls={wide ? "lb-panel" : `lb-detail-${i}`}
                  aria-expanded={wide ? undefined : active}
                  tabIndex={wide && !active ? -1 : 0}
                  onMouseEnter={() => wide && hoverCapable() && setSel(i)}
                  onFocus={() => wide && setSel(i)}
                  onClick={() => setSel(i)}
                >
                  <span className="lb-row-label">{item.label}</span>
                  <span className="lb-row-value">
                    <Chevron dir="left" />
                    {item.short}
                    <Chevron dir="right" />
                  </span>
                </button>

                {/* Phones: selected row expands in place. */}
                {!wide && active && (
                  <div className="lb-detail" id={`lb-detail-${i}`}>
                    <img className="lb-detail-art" src={PANEL_IMAGE} alt="" aria-hidden="true" loading="lazy" />
                    <div className="lb-detail-text">
                      <p className="lb-tag">
                        <FeatureIcon type={item.icon} size={16} />
                        {num(i)} <span>/</span> {item.tag}
                      </p>
                      {lines(item.value).map((l) => (
                        <p className="lb-value" key={l}>
                          {l}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="lb-help" aria-hidden="true">
          {wide ? "Hover or use the arrow keys to browse" : "Tap a row to view details"}
        </p>
      </div>

      {/* ---------- Preview (desktop) ---------- */}
      {wide && (
        <div className="lb-panel" id="lb-panel" role="tabpanel" aria-labelledby={`lb-tab-${sel}`}>
          <img className="lb-art" src={PANEL_IMAGE} alt="" aria-hidden="true" loading="lazy" />
          <div className="lb-panel-shade" aria-hidden="true" />

          <div className="lb-panel-text">
            <p className="lb-tag">
              <FeatureIcon type={current.icon} size={18} />
              {num(sel)} <span>/</span> {current.label}
            </p>
            <p className="lb-panel-sub">{current.tag}</p>
            <div className="lb-panel-value">
              {lines(current.value).map((l) => (
                <p key={l}>{l}</p>
              ))}
            </div>
          </div>

          <div className="lb-pips" aria-hidden="true">
            {items.map((item, i) => (
              <span key={item.label} className={i === sel ? "is-on" : ""} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
