import { useEffect, useRef } from "react";
import { gsap } from "../../animations/gsap";
import "./HeroLightFX.css";

/**
 * Neon city glow for the hero, in the spirit of an open-world game loading
 * screen: coloured light pools that drift, pulse and strobe.
 *
 * A small "director" randomly changes two global moods:
 *  - tempo:     fast strobing / slow breathing / mixed
 *  - formation: lights roam the whole hero, or gather just below the logo
 * Each light reads the current mood every cycle, so speed, size and placement
 * keep changing without ever repeating a fixed loop.
 */

type Tempo = "fast" | "slow" | "mixed";
type Formation = "spread" | "focus";

const COLORS = ["pink", "purple", "orange", "cyan", "blue", "magenta", "teal"] as const;

export default function HeroLightFX() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = root.current;
    if (!field) return;

    const rand = gsap.utils.random;
    // Tweens created later in callbacks are not tracked by gsap.context,
    // so loops check this flag and cleanup kills anything still running.
    let alive = true;
    let orbEls: HTMLElement[] = [];
    const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

    const ctx = gsap.context(() => {
      const mobile = window.matchMedia("(max-width: 700px)").matches;
      const orbs = gsap.utils
        .toArray<HTMLElement>(".hlfx-orb")
        .slice(0, mobile ? 4 : COLORS.length);

      orbEls = orbs;
      gsap.set(orbs, { xPercent: -50, yPercent: -50, opacity: 0 });

      const size = () => ({ w: field.clientWidth, h: field.clientHeight });

      // Area just below the DECODEX logo, relative to the light field.
      const focusPoint = () => {
        const { w, h } = size();
        const hero = field.closest(".hero");
        const title = hero?.querySelector(".hero-title");
        if (!title) return { x: w / 2, y: h * 0.62 };
        const f = field.getBoundingClientRect();
        const t = title.getBoundingClientRect();
        return { x: t.left + t.width / 2 - f.left, y: t.bottom - f.top + h * 0.04 };
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const { w, h } = size();
        orbs.forEach((orb, i) => {
          gsap.set(orb, {
            x: w * (0.15 + (0.7 * i) / Math.max(1, orbs.length - 1)),
            y: h * (i % 2 ? 0.35 : 0.65),
            opacity: 0.18,
            scale: 0.9,
          });
        });
        return;
      }

      const peakScale = mobile ? 0.6 : 1;
      const mood: { tempo: Tempo; formation: Formation } = { tempo: "mixed", formation: "focus" };
      const moveTweens = new Map<HTMLElement, gsap.core.Tween>();

      // ---- Placement & radius -------------------------------------------
      const move = (orb: HTMLElement, snap = false) => {
        if (!alive) return;
        const { w, h } = size();
        let x: number;
        let y: number;

        if (mood.formation === "focus") {
          const p = focusPoint();
          x = p.x + rand(-0.24, 0.24) * w;
          y = p.y + rand(-0.06, 0.14) * h;
        } else {
          x = rand(0.02, 0.98) * w;
          y = rand(0.04, 0.96) * h;
        }

        // Random radius: independent X/Y so pools vary from tight spots to wide washes.
        const base = mood.formation === "focus" ? rand(0.35, 1.05) : rand(0.45, 1.7);
        const scaleX = base * rand(0.75, 1.35) * (mobile ? 0.8 : 1);
        const scaleY = base * rand(0.6, 1.1) * (mobile ? 0.8 : 1);

        const fast =
          mood.tempo === "fast" || (mood.tempo === "mixed" && Math.random() < 0.45);

        moveTweens.get(orb)?.kill();
        const tween = gsap.to(orb, {
          x,
          y,
          scaleX,
          scaleY,
          duration: snap ? rand(0.9, 1.6) : fast ? rand(0.6, 1.5) : rand(2.6, 5.5),
          ease: fast ? "power3.out" : "sine.inOut",
          onComplete: () => move(orb),
        });
        moveTweens.set(orb, tween);
      };

      // ---- Flicker ---------------------------------------------------------
      const flicker = (orb: HTMLElement, peak: number) => {
        if (!alive) return;
        const tl = gsap.timeline({ onComplete: () => flicker(orb, peak) });
        const top = peak * peakScale * rand(0.7, 1.15);
        const low = top * rand(0.05, 0.3);
        const roll = Math.random();

        const tempo: Tempo =
          mood.tempo === "mixed" ? (Math.random() < 0.5 ? "fast" : "slow") : mood.tempo;

        if (roll < 0.08) {
          // Blackout: light drops out, then comes back.
          tl.to(orb, { opacity: 0, duration: rand(0.05, 0.2) }).to({}, { duration: rand(0.3, 1.3) });
        } else if (roll < 0.22) {
          // Neon buzz: a burst of rapid stutters.
          const blinks = Math.round(rand(3, 7));
          for (let i = 0; i < blinks; i += 1) {
            tl.to(orb, { opacity: top * rand(0.6, 1), duration: rand(0.025, 0.06), ease: "none" }).to(orb, {
              opacity: low * rand(0.2, 1),
              duration: rand(0.03, 0.08),
              ease: "none",
            });
          }
        } else if (tempo === "fast") {
          tl.to(orb, { opacity: top, duration: rand(0.06, 0.18), ease: "power2.out" })
            .to(orb, { opacity: low, duration: rand(0.08, 0.25), ease: "power1.in" });
        } else {
          tl.to(orb, { opacity: top, duration: rand(0.7, 1.9), ease: "sine.inOut" })
            .to({}, { duration: rand(0, 0.8) })
            .to(orb, { opacity: low, duration: rand(0.8, 2.2), ease: "sine.inOut" });
        }
      };

      // ---- Director --------------------------------------------------------
      const changeTempo = () => {
        if (!alive) return;
        mood.tempo = pick<Tempo>(["fast", "slow", "slow", "mixed", "mixed"]);
        gsap.delayedCall(mood.tempo === "fast" ? rand(1.8, 3.5) : rand(4, 8), changeTempo);
      };

      const changeFormation = () => {
        if (!alive) return;
        const next: Formation = mood.formation === "focus" ? "spread" : "focus";
        // Occasionally hold the same formation for longer.
        mood.formation = Math.random() < 0.75 ? next : mood.formation;
        // Re-target every light now so the regroup is visible, slightly staggered.
        orbs.forEach((orb, i) => gsap.delayedCall(i * rand(0.04, 0.16), () => move(orb, true)));
        gsap.delayedCall(rand(5, 10), changeFormation);
      };

      const peaks = [0.55, 0.45, 0.4, 0.42, 0.38, 0.36, 0.34];
      orbs.forEach((orb, i) => {
        const { w, h } = size();
        const p = focusPoint();
        gsap.set(orb, {
          x: p.x + rand(-0.2, 0.2) * w,
          y: p.y + rand(-0.04, 0.1) * h,
          scale: rand(0.5, 1),
        });
        gsap.delayedCall(rand(0, 0.6), () => {
          flicker(orb, peaks[i] ?? 0.35);
          move(orb);
        });
      });

      gsap.delayedCall(rand(3, 5), changeTempo);
      gsap.delayedCall(rand(5, 8), changeFormation);
    }, root);

    return () => {
      alive = false;
      gsap.killTweensOf(orbEls);
      ctx.revert();
    };
  }, []);

  return (
    <div className="hlfx" ref={root} aria-hidden="true">
      {COLORS.map((color) => (
        <div key={color} className={`hlfx-orb hlfx-${color}`} />
      ))}
    </div>
  );
}
