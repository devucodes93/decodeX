import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { EVENT } from "../../config/event";
import { ASSETS } from "../../config/assets";
import { SecondaryButton } from "../ui";
import { RegisterButton } from "../RegisterButton";
import { gsap } from "../../animations/gsap";
import { ParticleField } from "../visuals/ParticleField";
import HeroLightFX from "../visuals/HeroLightFX";

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const heroImgRef = useRef<HTMLImageElement>(null);
  const titleImgRef = useRef<HTMLImageElement>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [titleLoaded, setTitleLoaded] = useState(false);

  useEffect(() => {
    if (heroImgRef.current?.complete && heroImgRef.current.naturalWidth > 0) {
      setHeroLoaded(true);
    }
    if (titleImgRef.current?.complete && titleImgRef.current.naturalWidth > 0) {
      setTitleLoaded(true);
    }
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".hero-title-line",
          { yPercent: 115, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 1.1,
            ease: "power4.out",
            delay: 0.24,
          },
        );

        gsap.from(".hero-eyebrow", {
          y: 16,
          opacity: 0,
          duration: 0.7,
          delay: 0.12,
          ease: "power3.out",
        });

        gsap.from(".hero-description, .hero-actions", {
          y: 22,
          opacity: 0,
          duration: 0.8,
          stagger: 0.14,
          delay: 0.82,
          ease: "power3.out",
        });

        gsap.from(".hero-foot", {
          opacity: 0,
          duration: 0.9,
          delay: 1.2,
          ease: "power2.out",
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          ".hero-title-line, .hero-eyebrow, .hero-description, .hero-actions, .hero-foot",
          {
            clearProps: "all",
          },
        );
      });

      return () => mm.revert();
    },
    { scope: heroRef },
  );

  return (
    <section className="hero" ref={heroRef}>
      <picture>
        <source media="(max-width: 700px)" srcSet={ASSETS.gtaPhone} />
        <img
          ref={heroImgRef}
          className={`hero-bg${heroLoaded ? " is-loaded" : ""}`}
          src={ASSETS.gtaHero}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onLoad={() => setHeroLoaded(true)}
        />
      </picture>
      <span
        className={`media-placeholder hero-bg-placeholder${heroLoaded ? " is-hidden" : ""}`}
        aria-hidden="true"
      />
      <div className="hero-scrim" aria-hidden="true" />
      <HeroLightFX />
      <ParticleField />
      <div className="grain" aria-hidden="true" />
      <div className="wrap hero-in">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
            <span className="eyebrow-dot" />
            <img
              src="/assets/photos/sps.png"
              alt="SPS"
              className="hero-eyebrow-logo"
              loading="lazy"
              decoding="async"
            />
          </p>
          <div className="hero-title-stage">
            <h1 className="hero-title" aria-label={EVENT.name}>
              <span className="hero-title-mask">
                <span
                  className={`media-placeholder hero-title-placeholder${titleLoaded ? " is-hidden" : ""}`}
                  aria-hidden="true"
                />
                <img
                  ref={titleImgRef}
                  className="hero-title-line"
                  src={ASSETS.title}
                  alt=""
                  width={2245}
                  height={922}
                  fetchPriority="high"
                  draggable={false}
                  onLoad={() => setTitleLoaded(true)}
                />
              </span>
            </h1>
          </div>
          <p className="hero-tagline">{EVENT.tagline}</p>
          <p className="lead hero-description">{EVENT.description}</p>
          <div className="cta-row center hero-actions">
            <RegisterButton to="/register" />
            <SecondaryButton to="/about">Learn More</SecondaryButton>
          </div>
        </div>
      </div>
      <div className="hero-foot" aria-hidden="true">
        <span>Signal Processing CTF</span>
        <span className="hero-foot-line" />
        <span>Decode the signal</span>
      </div>
    </section>
  );
}
