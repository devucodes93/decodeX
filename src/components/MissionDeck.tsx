import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "../animations/gsap";
import "./MissionDeck.css";

export type Mission = {
  title: string;
  /** Short codename shown in the header, e.g. "Signal intercept". */
  codename: string;
  body: string;
  /** Tiny uppercase mission-info tags. */
  meta: string[];
  /** Background artwork (public path). */
  image: string;
};

/**
 * "Inside the mission" cards styled as a game mission-select screen.
 *
 * One card is active at a time:
 *  - Desktop (hover-capable pointer): mouse enter / leave.
 *  - Touch devices: only the card crossing the viewport centre while
 *    scrolling (no tap/touch activation).
 *  - Keyboard: focus.
 * The active state is a GSAP timeline per card (art push-in, lighter shade,
 * title lift, body/meta reveal, accent line), played forward / reversed.
 */
export function MissionDeck({ missions }: { missions: Mission[] }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const timelines = useRef<gsap.core.Timeline[]>([]);
  const [active, setActive] = useState<number | null>(null);

  useGSAP(
    () => {
      const deck = deckRef.current;
      if (!deck) return;
      const cards = gsap.utils.toArray<HTMLElement>(".mcard", deck);
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        timelines.current = cards.map((card) => {
          const q = gsap.utils.selector(card);
          return gsap
            .timeline({ paused: true, defaults: { duration: 0.45, ease: "power3.out" } })
            .to(q(".mcard-art"), { scale: 1.06, opacity: 0.9, duration: 0.6, ease: "power2.out" }, 0)
            .to(q(".mcard-text-shade"), { opacity: 1 }, 0)
            .to(q(".mcard-prompt"), { opacity: 0, y: 10, duration: 0.25, ease: "power2.in" }, 0)
            .fromTo(q(".mcard-title"), { opacity: 0, y: 22 }, { opacity: 1, y: 0 }, 0.08)
            .fromTo(q(".mcard-reveal"), { height: 0, opacity: 0 }, { height: "auto", opacity: 1 }, 0.12)
            .fromTo(q(".mcard-meta li"), { opacity: 0, y: 6 }, { opacity: 1, y: 0, stagger: 0.05 }, 0.12)
            .fromTo(q(".mcard-line"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.inOut" }, 0.08)
            .fromTo(q(".mcard-cta"), { opacity: 0, x: -8 }, { opacity: 1, x: 0 }, 0.18);
        });

        // Touch devices: activate the card crossing the viewport centre.
        const touch = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        if (touch) {
          cards.forEach((card, i) => {
            ScrollTrigger.create({
              trigger: card,
              start: "top center",
              end: "bottom center",
              onToggle: (self) =>
                setActive((cur) => (self.isActive ? i : cur === i ? null : cur)),
            });
          });
        }

        return () => {
          timelines.current.forEach((tl) => tl.kill());
          timelines.current = [];
        };
      });

      // Reduced motion: no animation, details always visible.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        deck.classList.add("mdeck--static");
        return () => deck.classList.remove("mdeck--static");
      });

      return () => mm.revert();
    },
    { scope: deckRef },
  );

  // Drive the per-card timelines from the single active index.
  useEffect(() => {
    timelines.current.forEach((tl, i) => {
      if (i === active) tl.timeScale(1).play();
      else tl.timeScale(1.4).reverse();
    });
  }, [active]);

  // Subtle horizontal parallax of the artwork following the mouse.
  const onMove = (e: MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const art = card.querySelector(".mcard-art");
    if (!art) return;
    const rect = card.getBoundingClientRect();
    const rel = (e.clientX - rect.left) / rect.width - 0.5;
    gsap.to(art, { xPercent: rel * -3, duration: 0.6, ease: "power2.out", overwrite: "auto" });
  };

  const onLeave = (e: MouseEvent<HTMLElement>) => {
    // Read everything from the event now: React runs the state updater later,
    // after the browser has cleared e.currentTarget (it becomes null).
    const card = e.currentTarget;
    const index = Number(card.dataset.index);
    const art = card.querySelector(".mcard-art");
    if (art) gsap.to(art, { xPercent: 0, duration: 0.6, ease: "power2.out", overwrite: "auto" });
    setActive((cur) => (cur === index ? null : cur));
  };

  const hoverCapable = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  return (
    <div className="mdeck" ref={deckRef}>
      {missions.map((m, i) => {
        const num = String(i + 1).padStart(2, "0");
        return (
          <article
            key={m.title}
            className={`mcard mcard--${i % 4}${active === i ? " is-active" : ""}`}
            data-index={i}
            tabIndex={0}
            aria-label={`Mission ${num}: ${m.title}. ${m.body}`}
            onMouseEnter={() => hoverCapable() && setActive(i)}
            onMouseMove={(e) => hoverCapable() && onMove(e)}
            onMouseLeave={(e) => hoverCapable() && onLeave(e)}
            // Keyboard focus only (a tap on a phone also focuses the card, but
            // phones reveal purely on scroll, so ignore non-keyboard focus).
            onFocus={(e) => e.currentTarget.matches(":focus-visible") && setActive(i)}
            onBlur={() => hoverCapable() && setActive((cur) => (cur === i ? null : cur))}
          >
            <div className="mcard-art" style={{ backgroundImage: `url(${m.image})` }} aria-hidden="true" />
            <div className="mcard-shade" aria-hidden="true" />
            <div className="mcard-text-shade" aria-hidden="true" />
            <div className="mcard-grain" aria-hidden="true" />

            <div className="mcard-content" aria-hidden="true">
              <p className="mcard-id">
                <span className="mcard-marker" />
                Mission {num}
                <span className="mcard-sep">/</span>
                {m.codename}
              </p>

              <span className="mcard-bignum">{num}</span>

              {/* Default state: only the artwork + this prompt. */}
              <span className="mcard-prompt">
                <span className="mcard-prompt-line" />
                <span className="mcard-prompt-text mcard-prompt-text--hover">Hover to reveal</span>
                <span className="mcard-prompt-text mcard-prompt-text--touch">Scroll to reveal</span>
              </span>

              <h3 className="mcard-title">{m.title}</h3>

              <div className="mcard-reveal">
                <p className="mcard-body">{m.body}</p>
              </div>

              <span className="mcard-line" />

              <ul className="mcard-meta">
                {m.meta.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>

              <span className="mcard-cta">
                Access objective
                <svg viewBox="0 0 24 12" fill="none" aria-hidden="true">
                  <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
