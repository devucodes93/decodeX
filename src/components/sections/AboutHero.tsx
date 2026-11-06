import { Link } from "react-router-dom";
import { useGSAP } from "@gsap/react";
import { gsap, isTouch, SCRUB } from "../../animations/gsap";
import { EVENT } from "../../config/event";
import { useAboutAnimation } from "../../animations/useAboutAnimation";
import AboutHazardTape from "../AboutHazardTape";
import "../../pages/AboutPage.css";
import "../../styles/film.css";
import { TitleArt } from "../ui/TitleArt";

type AboutHeroProps = {
  /** "page" = top of the About page (h1, animates on load).
   *  "section" = embedded on Home (h2, animates on scroll, shows Learn more). */
  variant?: "page" | "section";
  /** About page: the artwork is drawn once by a parent wrapper that spans
   *  the hero AND the purpose section, so the hero skips its own. */
  sharedBackground?: boolean;
};

export function AboutHero({ variant = "page", sharedBackground = false }: AboutHeroProps) {
  const isSection = variant === "section";
  const container = useAboutAnimation(isSection);
  const Heading = isSection ? "h2" : "h1";

  // Depth layers + (on Home) the scroll-driven blend out of the hero.
  useGSAP(
    () => {
      const el = container.current;
      if (!el) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Phones/tablets: no scroll-driven movement (it lagged behind the
        // finger and kept settling after scrolling stopped); the artwork
        // simply shows in its final state. Laptops: locked to the scroll.
        if (isTouch()) return;

        // Parallax across the section's time on screen. Slower layers get a
        // larger counter-offset: artwork ~0.2x, character ~0.5x, tape ~0.8x.
        const range = {
          trigger: el,
          start: isSection ? "top bottom" : "top top",
          end: "bottom top",
          scrub: SCRUB,
        };
        if (!sharedBackground) {
          gsap.fromTo(".about-bg-img", { yPercent: isSection ? -6 : 0 }, { yPercent: 6, ease: "none", force3D: true, scrollTrigger: range });
        }
        if (!sharedBackground) {
          gsap.fromTo(".about-character", { yPercent: isSection ? -4 : 0 }, { yPercent: 4, ease: "none", scrollTrigger: range });
        }
        gsap.fromTo(".about-hazard-tape", { y: isSection ? -14 : 0 }, { y: 14, ease: "none", scrollTrigger: range });

      });

      return () => mm.revert();
    },
    { scope: container },
  );

  return (
    <div
      className={`about-hero${isSection ? " about-hero--section" : ""}${sharedBackground ? " about-hero--shared" : ""}`}
      ref={container}
    >
      {!sharedBackground && (
        <>
          <img
            className="about-bg-img"
            src="/assets/photos/GTA4.jpg"
            alt=""
            aria-hidden="true"
            loading={isSection ? "lazy" : "eager"}
            fetchPriority={isSection ? "auto" : "high"}
          />
          <div className="about-scrim" aria-hidden="true" />
          <div className="film" aria-hidden="true" />
        </>
      )}
      {/* Character art: Home section only (removed from the About page). */}
      {!sharedBackground && (
        <img
          src="/assets/photos/char1.png"
          className="about-character"
          alt=""
          aria-hidden="true"
          loading={isSection ? "lazy" : "eager"}
          decoding="async"
        />
      )}

      <div className="about-hero-content">
        <span className="about-warning-label">DECODEX / ABOUT</span>
        <Heading className="about-heading">
          <TitleArt text="Mission Briefing" size="page" />
        </Heading>
        <p className="about-description">{EVENT.description}</p>
        {isSection && (
          <Link className="about-more" to="/about">
            <span>Learn more</span>
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        )}
        <AboutHazardTape label="SIGNAL INVESTIGATION" />
      </div>
    </div>
  );
}
