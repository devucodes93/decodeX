import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "../animations/gsap";
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
  /** Optional small detail lines under the value (e.g. fee tiers). */
  details?: string[];
};

/** One artwork for the whole preview, and the menu header banner. */
const PANEL_IMAGE = "/assets/eligibility/lobby-panel.jpg";
const BANNER_IMAGE = "/assets/eligibility/lobby-banner.jpg";

/** Scroll distance (in viewport heights) spent on each row while pinned. */
const STEP_VH = 0.3;

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
  <svg className="lb-chev" viewBox="0 0 8 12" aria-hidden="true">
    <path d={dir === "left" ? "M6.5 1 1.5 6l5 5" : "M1.5 1l5 5-5 5"} fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

/**
 * Eligibility & event format as an in-game job lobby: a menu (artwork
 * banner, sub-bar with a position counter, rows with the selected one
 * inverted) and a preview of the selected row.
 *
 * Scroll-driven ("focused scroll"): the lobby pins in view and the page's
 * scroll position selects the row, snapping row by row; once the last row
 * is reached the page continues. Clicking a row or using the arrow keys
 * scrolls to that row's position, so scroll and selection always agree.
 * Reduced motion: no pinning; click / arrow keys select directly.
 */
export function MissionLobby({ items }: { items: LobbyItem[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [sel, setSel] = useState(0);
  const current = items[sel];
  const last = items.length - 1;

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || reduced()) return;

      // Entrance: rows slide in, preview wipes open.
      gsap
        .timeline({
          scrollTrigger: { trigger: root, start: "top 85%", once: true },
          defaults: { ease: "power3.out" },
        })
        .from(".lb-banner, .lb-subbar", { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 })
        .from(".lb-row", { x: -26, opacity: 0, duration: 0.45, stagger: 0.06 }, "-=0.25")
        .fromTo(
          ".lb-panel",
          { clipPath: "inset(0% 100% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "power4.inOut", clearProps: "clipPath" },
          0.15,
        );

      // Focused scroll: pin + map progress to the selected row.
      const mm = gsap.matchMedia();
      const pin = (start: string) => {
        stRef.current = ScrollTrigger.create({
          trigger: root,
          start,
          end: () => `+=${last * window.innerHeight * STEP_VH}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          snap: {
            snapTo: 1 / last,
            duration: { min: 0.15, max: 0.3 },
            delay: 0.02,
            ease: "power2.inOut",
          },
          onUpdate: (self) => {
            const i = Math.round(self.progress * last);
            setSel((cur) => (cur === i ? cur : i));
          },
        });
        return () => {
          stRef.current?.kill();
          stRef.current = null;
        };
      };
      // Laptops: centred in the viewport. Phones: just under the navbar.
      mm.add("(min-width: 900px)", () => pin("center center"));
      mm.add("(max-width: 899px)", () => pin("top 76px"));

      return () => mm.revert();
    },
    { scope: rootRef },
  );

  // Preview change: the artwork stays exactly as it is; only the text
  // content changes, sliding in.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reduced()) return;
    const text = root.querySelectorAll<HTMLElement>(".lb-panel-text > *");
    gsap.fromTo(text, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power3.out", overwrite: true });
  }, [sel]);

  /** Select a row: scroll to its position when pinned, else set directly. */
  const goTo = (i: number) => {
    const st = stRef.current;
    if (!st) {
      setSel(i);
      return;
    }
    const y = st.start + (st.end - st.start) * (i / last);
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowDown: Math.min(sel + 1, last),
      ArrowUp: Math.max(sel - 1, 0),
      Home: 0,
      End: last,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = keys[e.key];
    goTo(next);
    tabRefs.current[next]?.focus({ preventScroll: true });
  };

  const num = (i: number) => String(i + 1).padStart(2, "0");
  const lines = (v: string) => v.split("\n").map((l) => l.replace(/^\s*•\s*/, "").trim()).filter(Boolean);

  return (
    <div className="lobby" ref={rootRef}>
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
          role="tablist"
          aria-orientation="vertical"
          aria-label="Eligibility and event format"
          onKeyDown={onKeyDown}
        >
          {items.map((item, i) => {
            const active = i === sel;
            return (
              <button
                key={item.label}
                type="button"
                ref={(el) => (tabRefs.current[i] = el)}
                className={`lb-row${active ? " is-active" : ""}`}
                id={`lb-tab-${i}`}
                role="tab"
                aria-selected={active}
                aria-controls="lb-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => goTo(i)}
              >
                <span className="lb-row-label">{item.label}</span>
                <span className="lb-row-value">
                  <Chevron dir="left" />
                  {item.short}
                  <Chevron dir="right" />
                </span>
              </button>
            );
          })}
        </div>

        <p className="lb-help" aria-hidden="true">
          Scroll to browse
        </p>
      </div>

      {/* ---------- Preview ---------- */}
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
          {current.details && (
            <ul className="lb-details">
              {current.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="lb-pips" aria-hidden="true">
          {items.map((item, i) => (
            <span key={item.label} className={i === sel ? "is-on" : ""} />
          ))}
        </div>
      </div>
    </div>
  );
}
