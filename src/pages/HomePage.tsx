import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { Hero } from "../components/sections/Hero";
import { AboutHero } from "../components/sections/AboutHero";
import { RegistrationCTA } from "../components/sections/Blocks";
import { EVENT } from "../config/event";
import { useTitle } from "../hooks";
import { gsap, isTouch, SCRUB } from "../animations/gsap";
import "./HomePage.css";

export default function HomePage() {
  useTitle(`${EVENT.name} | Signal Processing CTF Challenge`);
  const finaleRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  // Hero -> About: the hero stays in place (CSS sticky - smooth, handled by
  // the browser) while the About section slides up over it like a card.
  // Underneath, the hero artwork zooms in and darkens, locked to the scroll.
  useGSAP(
    () => {
      const stack = stackRef.current;
      const hero = stack?.querySelector<HTMLElement>(".hero--home");
      const card = stack?.querySelector<HTMLElement>(".about-hero--section");
      if (!stack || !hero || !card) return;

      // If the hero is taller than the screen, let it scroll until its
      // bottom is visible before it sticks, so no hero content is hidden.
      // Phones: it also scrolls up ~35% of the screen first, so it moves
      // with the page and only holds lightly while the card slides over.
      const touch = isTouch();
      const setStick = () => {
        const base = Math.min(0, window.innerHeight - hero.offsetHeight);
        const extra = touch ? -0.35 * window.innerHeight : 0;
        hero.style.setProperty("--hero-stick", `${base + extra}px`);
      };
      setStick();
      // Phones fire "resize" when the address bar shows/hides; only react to
      // real width changes (rotation) so the hero never jumps mid-scroll.
      let lastWidth = window.innerWidth;
      const onResize = () => {
        if (touch && window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        setStick();
      };
      window.addEventListener("resize", onResize);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Phones/tablets: lighter "card deck" version - the whole hero
        // shrinks slightly and darkens as the About card slides over it.
        if (touch) {
          const deck = {
            trigger: card,
            start: "top bottom",
            end: "top top",
            scrub: SCRUB,
            onLeave: () => hero.classList.add("is-covered"),
            onEnterBack: () => hero.classList.remove("is-covered"),
          };
          gsap.fromTo(
            hero,
            { scale: 1 },
            { scale: 0.92, transformOrigin: "50% 0%", ease: "none", force3D: true, scrollTrigger: deck },
          );
          gsap.fromTo(".hero-cover", { opacity: 0 }, { opacity: 1, ease: "none", scrollTrigger: { ...deck, onLeave: undefined, onEnterBack: undefined } });
          return;
        }

        const cover = {
          trigger: card,
          start: "top bottom",
          end: "top top",
          scrub: SCRUB,
          // Fully covered: stop painting the hero underneath the page.
          onLeave: () => hero.classList.add("is-covered"),
          onEnterBack: () => hero.classList.remove("is-covered"),
        };
        gsap.fromTo(".hero-bg-wrap", { scale: 1 }, { scale: 1.15, ease: "none", force3D: true, scrollTrigger: cover });
        gsap.fromTo(".hero-cover", { opacity: 0 }, { opacity: 1, ease: "none", scrollTrigger: { ...cover, onLeave: undefined, onEnterBack: undefined } });
      });

      return () => {
        window.removeEventListener("resize", onResize);
        hero.classList.remove("is-covered");
        mm.revert();
      };
    },
    { scope: stackRef },
  );

  // About -> Register: the register artwork fades up from nothing and
  // settles from a slight push-in as the section scrolls in. Driven by a CSS
  // variable because the artwork is a ::before layer.
  useGSAP(
    () => {
      const el = finaleRef.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Phones/tablets: shown in its final state (no scroll-driven fade).
        if (isTouch()) return;
        gsap.fromTo(
          el,
          { "--finale": 0 },
          {
            "--finale": 1,
            ease: "none",
            scrollTrigger: { trigger: el, start: "top 95%", end: "top 25%", scrub: SCRUB },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: finaleRef },
  );

  return (
    <>
      <div className="home-stack" ref={stackRef}>
        <Hero />
        <AboutHero variant="section" />
      </div>
      <div className="home-finale" ref={finaleRef}>
        <RegistrationCTA hasBg={true} />
      </div>
    </>
  );
}
