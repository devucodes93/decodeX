import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "../../animations/gsap";

function WantedStar() {
  return (
    <svg
      className="wanted-star"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon
        points="50,3 61,36 96,36 68,57 79,91 50,70 21,91 32,57 4,36 39,36"
        fill="#F2F2F2"
        stroke="#171717"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CONTENT = (
  <>
    BUILD <WantedStar />
    CREATE <WantedStar />
    INNOVATE <WantedStar />
    DECODEX <WantedStar />
  </>
);

export function Marquee() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
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
    },
    { scope: ref },
  );

  return (
    <div className="marquee" ref={ref} aria-hidden="true">
      <style>{`
        .wanted-star {
          display: inline-block;
          width: 58px;
          height: 58px;
          flex: 0 0 auto;
          vertical-align: middle;
          margin: 0 14px;
          filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.45));
        }

        .marquee-content {
          display: flex;
          align-items: center;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .wanted-star {
            width: 38px;
            height: 38px;
            margin: 0 9px;
          }
        }
      `}</style>

      <div className="marquee-track">
        <div className="marquee-content">{CONTENT}</div>
        <div className="marquee-content">{CONTENT}</div>
      </div>
    </div>
  );
}
