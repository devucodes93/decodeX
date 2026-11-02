import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function useAboutAnimation() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = container.current;
      if (!el) return;

      const heading = el.querySelector<HTMLElement>(".about-heading");
      const label = el.querySelector<HTMLElement>(".about-warning-label");
      const description = el.querySelector<HTMLElement>(".about-description");
      const character = el.querySelector<HTMLElement>(".about-character");
      const tape = el.querySelectorAll<HTMLElement>(".about-hazard-tape");

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      if (label) {
        timeline.fromTo(
          label,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.6 }
        );
      }

      if (heading) {
        timeline.fromTo(
          heading,
          { opacity: 0, y: 35 },
          { opacity: 1, y: 0, duration: 0.9 },
          "-=0.2"
        );
      }

      if (description) {
        timeline.fromTo(
          description,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.7 },
          "-=0.4"
        );
      }

      if (character) {
        timeline.fromTo(
          character,
          { opacity: 0, x: 90, y: 25 },
          { opacity: 0.78, x: 0, y: 0, duration: 1.3 },
          "-=0.7"
        );
      }

      if (tape.length > 0) {
        timeline.fromTo(
          tape,
          { opacity: 0, scaleX: 0.5 },
          {
            opacity: 0.9,
            scaleX: 1,
            duration: 0.6,
            stagger: 0.12,
          },
          "-=0.5"
        );
      }
    },
    { scope: container }
  );

  return container;
}
