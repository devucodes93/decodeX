import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { Hero } from "../components/sections/Hero";
import { AboutHero } from "../components/sections/AboutHero";
import { RegistrationCTA } from "../components/sections/Blocks";
import { EVENT } from "../config/event";
import { useTitle } from "../hooks";
import { gsap } from "../animations/gsap";
import "./HomePage.css";

export default function HomePage() {
  useTitle(`${EVENT.name} | Signal Processing CTF Challenge`);
  const finaleRef = useRef<HTMLDivElement>(null);

  // About -> Register: the register artwork fades up from nothing and
  // settles from a slight push-in as the section scrolls in. Driven by a CSS
  // variable because the artwork is a ::before layer.
  useGSAP(
    () => {
      const el = finaleRef.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
        gsap.fromTo(
          el,
          { "--finale": 0 },
          {
            "--finale": 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 95%", end: "top 25%", scrub: touch ? 0.4 : 1 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: finaleRef },
  );

  return (
    <>
      <Hero />
      <AboutHero variant="section" />
      <div className="home-finale" ref={finaleRef}>
        <RegistrationCTA hasBg={true} />
      </div>
    </>
  );
}
