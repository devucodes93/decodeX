import { useEffect, useRef } from "react";
import { gsap } from "../../animations/gsap";
import "./HeroLightFX.css";

/**
 * Prismatic neon flicker behind and beneath the DECODEX logo.
 *
 * Not a steady glow: the field is dark most of the time, and short pulses of
 * cyan/blue, magenta/pink, red and warm yellow/orange light pop up at
 * irregular moments, like neon signs reflecting off wet streets and glass.
 *
 * - Each flash picks a fresh colour, position, size and a random soft shape
 *   (blob outline, proportions and angle) that morphs slightly while lit.
 * - Flash timing is irregular: long dark gaps, single pops, quick bursts.
 * - Sometimes a flash fires as an RGB "prism split": cyan, magenta and yellow
 *   copies side by side with a small offset.
 * - Lights move while lit: sometimes a very fast whip across the logo area,
 *   sometimes a slow drift, occasionally still.
 * - Fairly often (~1 in 3) a "strobe cluster" fires: 4–5 lights in different
 *   colours flicker very fast at once, each on its own rhythm, then go dark.
 */

// "r, g, b" strings used by the CSS radial gradient via --c.
const PALETTE = {
  cyan: "40, 220, 255",
  blue: "50, 110, 255",
  magenta: "235, 50, 220",
  pink: "255, 60, 140",
  red: "255, 45, 60",
  yellow: "255, 205, 70",
  orange: "255, 135, 45",
};
const SINGLE_COLORS = Object.values(PALETTE);
const PRISM = [PALETTE.cyan, PALETTE.magenta, PALETTE.yellow];

const POOL_SIZE = 10;

// Overall brightness (1 = full). Keep it subtle.
const INTENSITY = 0.8;

export default function HeroLightFX() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = root.current;
    if (!field) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rand = gsap.utils.random;
    const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const peakScale = (mobile ? 0.7 : 1) * INTENSITY;

    // Tweens created in callbacks aren't tracked by gsap.context, so loops
    // check this flag and cleanup kills anything still running.
    let alive = true;
    const orbs = Array.from(field.querySelectorAll<HTMLElement>(".hlfx-orb"));
    const busy = new Set<HTMLElement>();
    gsap.set(orbs, { xPercent: -50, yPercent: -50, opacity: 0 });

    // Region behind the lower part of the logo and just beneath it.
    const region = () => {
      const f = field.getBoundingClientRect();
      const title = field.closest(".hero")?.querySelector(".hero-title");
      if (!title) {
        return { x0: f.width * 0.25, x1: f.width * 0.75, y0: f.height * 0.35, y1: f.height * 0.6 };
      }
      const t = title.getBoundingClientRect();
      return {
        x0: t.left - f.left + t.width * 0.08,
        x1: t.right - f.left - t.width * 0.08,
        y0: t.top - f.top + t.height * 0.35,
        y1: t.bottom - f.top + t.height * 0.3,
      };
    };

    const freeOrb = () => orbs.find((o) => !busy.has(o));

    // Random organic outline, e.g. "62% 38% 55% 45% / 48% 60% 40% 52%".
    const randomBlob = () => {
      const r = () => `${Math.round(rand(20, 80))}%`;
      return `${r()} ${r()} ${r()} ${r()} / ${r()} ${r()} ${r()} ${r()}`;
    };

    /**
     * Random movement while a light is lit (lasting `total` seconds):
     *  - whip:  1–2 very fast dashes to new spots in the logo area
     *  - drift: slow glide a short distance
     *  - still: stays put
     */
    const travel = (orb: HTMLElement, total: number) => {
      const r = region();
      const roll = Math.random();
      if (roll < 0.4) {
        const dashes = Math.random() < 0.5 ? 1 : 2;
        const tl = gsap.timeline({ delay: rand(0, total * 0.3) });
        for (let i = 0; i < dashes; i += 1) {
          tl.to(orb, {
            x: rand(r.x0, r.x1),
            y: rand(r.y0, r.y1),
            duration: rand(0.12, 0.32),
            ease: "power3.out",
          });
        }
      } else if (roll < 0.85) {
        const dist = rand(50, 170) * (mobile ? 0.6 : 1);
        const angle = rand(0, Math.PI * 2);
        gsap.to(orb, {
          x: `+=${Math.cos(angle) * dist}`,
          y: `+=${Math.sin(angle) * dist * 0.6}`,
          duration: total,
          ease: "sine.inOut",
        });
      }
    };

    /** One brief pulse: snap on, tiny hold, decay to nothing. */
    const flash = (orb: HTMLElement, x: number, y: number, color: string, sx: number, sy: number, peak: number) => {
      busy.add(orb);
      orb.style.setProperty("--c", color);
      // Random shape: blob outline + random angle (sx/sy give uneven proportions).
      gsap.set(orb, {
        x,
        y,
        scaleX: sx,
        scaleY: sy,
        rotation: rand(0, 360),
        borderRadius: randomBlob(),
        opacity: 0,
      });

      const tl = gsap.timeline({ onComplete: () => busy.delete(orb) });
      // Some flashes stutter once before settling, like a neon tube catching.
      if (Math.random() < 0.25) {
        tl.to(orb, { opacity: peak * rand(0.5, 0.9), duration: rand(0.03, 0.06), ease: "none" })
          .to(orb, { opacity: peak * 0.1, duration: rand(0.03, 0.07), ease: "none" });
      }
      tl.to(orb, { opacity: peak, duration: rand(0.05, 0.16), ease: "power2.out" });
      if (Math.random() < 0.3) {
        // Fast flicker while lit: rapid on/off for a moment before fading.
        const blinks = Math.round(rand(4, 9));
        for (let i = 0; i < blinks; i += 1) {
          tl.to(orb, { opacity: peak * rand(0, 0.2), duration: rand(0.025, 0.06), ease: "none" })
            .to(orb, { opacity: peak * rand(0.7, 1), duration: rand(0.025, 0.06), ease: "none" });
        }
      } else {
        tl.to({}, { duration: rand(0, 0.18) });
      }
      tl.to(orb, { opacity: 0, duration: rand(0.3, 0.95), ease: "power2.in" });

      travel(orb, tl.duration());

      // Shape morphs a little while lit, so no two flashes look alike.
      gsap.to(orb, {
        borderRadius: randomBlob(),
        rotation: `+=${rand(-40, 40)}`,
        duration: tl.duration(),
        ease: "sine.inOut",
      });
    };

    const single = () => {
      const orb = freeOrb();
      if (!orb) return;
      const r = region();
      const scale = rand(0.45, 1.25);
      flash(
        orb,
        rand(r.x0, r.x1),
        rand(r.y0, r.y1),
        pick(SINGLE_COLORS),
        scale * rand(0.5, 1.8), // uneven proportions → random shapes
        scale * rand(0.5, 1.8),
        rand(0.22, 0.5) * peakScale,
      );
    };

    /** RGB prism split: three offset copies fired together. */
    const prism = () => {
      const r = region();
      const x = rand(r.x0, r.x1);
      const y = rand(r.y0, r.y1);
      const scale = rand(0.4, 0.85);
      const offset = rand(14, 34) * (mobile ? 0.6 : 1);
      const peak = rand(0.18, 0.36) * peakScale;
      PRISM.forEach((color, i) => {
        const orb = freeOrb();
        if (!orb) return;
        flash(orb, x + (i - 1) * offset, y + rand(-4, 4), color, scale * 1.5, scale * 0.6, peak);
      });
    };

    /** Strobe cluster: 4–5 lights flickering very fast together for ~1s. */
    const strobe = () => {
      const r = region();
      const count = Math.round(rand(4, 5));
      const colors = gsap.utils.shuffle([...SINGLE_COLORS]);

      for (let i = 0; i < count; i += 1) {
        const orb = freeOrb();
        if (!orb) return;
        busy.add(orb);
        const scale = rand(0.4, 0.95);
        const peak = rand(0.25, 0.5) * peakScale;
        orb.style.setProperty("--c", colors[i % colors.length]);
        gsap.set(orb, {
          x: rand(r.x0, r.x1),
          y: rand(r.y0, r.y1),
          scaleX: scale * rand(0.6, 1.6),
          scaleY: scale * rand(0.6, 1.6),
          rotation: rand(0, 360),
          borderRadius: randomBlob(),
          opacity: 0,
        });

        // Each light gets its own rapid on/off rhythm so they don't sync up.
        const tl = gsap.timeline({
          delay: rand(0, 0.12),
          onComplete: () => busy.delete(orb),
        });
        const end = gsap.ticker.time + rand(0.6, 1.4);
        const blinks = Math.round(rand(8, 16));
        for (let b = 0; b < blinks; b += 1) {
          tl.to(orb, { opacity: peak * rand(0.6, 1), duration: rand(0.02, 0.05), ease: "none" })
            .to(orb, { opacity: peak * rand(0, 0.15), duration: rand(0.03, 0.07), ease: "none" });
        }
        tl.to(orb, { opacity: 0, duration: 0.12, ease: "power1.in" });
        // Cap total length so the cluster always ends within ~1.4s.
        tl.timeScale(Math.max(1, tl.duration() / Math.max(0.6, end - gsap.ticker.time)));
        travel(orb, tl.duration() / tl.timeScale());
      }
    };

    /** Irregular scheduler: long dark gaps, single pops, and quick bursts. */
    const schedule = () => {
      if (!alive) return;
      const roll = Math.random();
      let next: number;

      if (roll < 0.15) {
        prism();
        next = rand(0.6, 2.2);
      } else if (roll < 0.45) {
        strobe();
        next = rand(1.2, 2.6);
      } else if (roll < 0.6) {
        // Burst: 2–4 quick pops in different colours.
        const count = Math.round(rand(2, 4));
        for (let i = 0; i < count; i += 1) gsap.delayedCall(i * rand(0.05, 0.2), () => alive && single());
        next = rand(0.8, 2.6);
      } else {
        single();
        next = rand(0.25, 1.6);
      }

      // Occasional longer dark pause so it never feels like a steady glow.
      if (Math.random() < 0.15) next += rand(1.5, 3.5);
      gsap.delayedCall(next, schedule);
    };

    gsap.delayedCall(rand(0.6, 1.2), schedule);

    return () => {
      alive = false;
      gsap.killTweensOf(orbs);
      gsap.killTweensOf(schedule);
      gsap.set(orbs, { opacity: 0 });
    };
  }, []);

  return (
    <div className="hlfx" ref={root} aria-hidden="true">
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <div key={i} className="hlfx-orb" />
      ))}
    </div>
  );
}
