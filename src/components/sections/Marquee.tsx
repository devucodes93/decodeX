import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../../animations/gsap";

const CONTENT = (
  <>
    BUILD <span>✦</span> CREATE <span>✦</span> INNOVATE <span>✦</span> DECODEX <span>✦</span>
  </>
);

export function Marquee() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const track = ref.current?.querySelector(".marquee-track");
      if (!track) return;
      gsap.to(track, {
        xPercent: -50,
        duration: 24,
        ease: "none",
        repeat: -1,
      });
    });
    return () => mm.revert();
  }, { scope: ref });

  return (
    <div className="marquee" ref={ref} aria-hidden="true">
      <div className="marquee-track">
        <div className="marquee-content">{CONTENT}</div>
        <div className="marquee-content">{CONTENT}</div>
      </div>
    </div>
  );
}
