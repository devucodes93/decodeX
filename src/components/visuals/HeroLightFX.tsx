import { useEffect, useRef } from "react";
import { gsap } from "../../animations/gsap";

export default function HeroLightFX() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;

    const ctx = gsap.context(() => {
      const lights = gsap.utils.toArray<HTMLElement>(".hero-light");

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(lights, { x: 0, y: 0, scale: 1, opacity: 0.26 });
        return;
      }

      const mobile = window.matchMedia("(max-width: 700px)").matches;
      const opacityScale = mobile ? 0.55 : 1;

      const settings = [
        { opacity: 0.55, scale: 0.48 },
        { opacity: 0.5, scale: 0.92 },
        { opacity: 0.45, scale: 0.38 },
        { opacity: 0.4, scale: 1.12 },
        { opacity: 0.36, scale: 0.66 },
      ];
      const rand = gsap.utils.random;

      lights.forEach((light, index) => {
        const s = settings[index];
        if (!s) return;

        const peak = s.opacity * opacityScale;
        const baseScale = s.scale * (mobile ? 0.88 : 1);

        gsap.set(light, {
          opacity: Math.max(0.03, peak * 0.16),
          scale: baseScale,
        });

        const flicker = () => {
          const fast = Math.random() < 0.62;
          const cyclePeak = peak * rand(0.72, 1.12);
          const low = Math.max(0.025, cyclePeak * rand(0.08, 0.34));
          const up = fast ? rand(0.08, 0.2) : rand(0.34, 0.82);
          const down = fast ? rand(0.07, 0.18) : rand(0.36, 0.95);

          gsap
            .timeline({ onComplete: flicker })
            .to(light, {
              opacity: cyclePeak,
              duration: up,
              ease: "power2.out",
            })
            .to(light, {
              opacity: low,
              duration: down,
              ease: "sine.inOut",
            });
        };

        const drift = () => {
          const fast = Math.random() < 0.42;

          gsap.to(light, {
            x: rand(-85, 85),
            y: rand(-65, 65),
            scale: baseScale * rand(0.72, 1.24),
            duration: fast ? rand(0.8, 1.7) : rand(2.8, 5.2),
            ease: fast ? "power2.out" : "sine.inOut",
            onComplete: drift,
          });
        };

        flicker();
        drift();
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div className="hero-light-field" ref={root} aria-hidden="true">
      <div className="hero-light hero-light-blue" />
      <div className="hero-light hero-light-red" />
      <div className="hero-light hero-light-purple" />
      <div className="hero-light hero-light-green" />
      <div className="hero-light hero-light-cyan" />
    </div>
  );
}
