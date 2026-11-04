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
        { opacity: 0.55 },
        { opacity: 0.5 },
        { opacity: 0.45 },
        { opacity: 0.4 },
        { opacity: 0.36 },
      ];

      lights.forEach((light, index) => {
        const s = settings[index];
        if (!s) return;

        const peak = s.opacity * opacityScale;

        gsap.fromTo(
          light,
          { opacity: Math.max(0.05, peak * 0.1) },
          {
            opacity: peak,
            duration: gsap.utils.random(0.35, 0.75),
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: index * 0.45,
          },
        );

        const drift = () => {
          gsap.to(light, {
            x: gsap.utils.random(-85, 85),
            y: gsap.utils.random(-65, 65),
            scale: gsap.utils.random(1, 1.35),
            duration: gsap.utils.random(2.8, 5.2),
            ease: "sine.inOut",
            onComplete: drift,
          });
        };

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
