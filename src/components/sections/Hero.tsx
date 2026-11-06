import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import { EVENT } from "../../config/event";
import { ASSETS } from "../../config/assets";
import { RegisterButton } from "../RegisterButton";
import { gsap } from "../../animations/gsap";
import { ParticleField } from "../visuals/ParticleField";
import HeroLightFX from "../visuals/HeroLightFX";
import { PrizePoolBadge } from "../PrizePoolBadge";
import "./Hero.css";
import "../../styles/film.css";

/** "22 November 2026" -> "22 Nov" */
const shortDate = (value: string) =>
  value
    .replace(/\s*\d{4}\s*$/, "")
    .replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*/, "$1");

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

        gsap.from(".hero-tagline, .hx-fact, .hero-actions, .hx-meta", {
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

      // Cinematic scroll: camera push + depth layers while the hero scrolls out.
      // On-screen speeds: artwork ~0.2x, light/particle layer ~0.8x, text 1x.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const hero = heroRef.current;
        if (!hero) return;
        // Touch devices scroll on a separate thread, so big JS-driven offsets
        // can lag a frame behind and look jittery. Use a lighter offset and
        // a shorter smoothing there; desktop gets a softer 1s catch-up.
        const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
        const out = {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: touch ? 0.4 : 1,
        };

        // Background (slowest) + its scrim stay aligned; slow push-in 1 -> 1.07.
        gsap.fromTo(
          ".hero-bg-wrap, .hero-scrim",
          { yPercent: 0 },
          { yPercent: touch ? 40 : 80, ease: "none", force3D: true, scrollTrigger: out },
        );
        gsap.fromTo(
          ".hero-bg-wrap",
          { scale: 1 },
          { scale: 1.07, ease: "none", scrollTrigger: out },
        );

        // Foreground light + particles: a little slower than the page.
        gsap.fromTo(
          ".hlfx, .particle-field",
          { yPercent: 0 },
          { yPercent: touch ? 10 : 20, ease: "none", force3D: true, scrollTrigger: out },
        );

        // Bottom strap fades out as the About section takes over.
        gsap.fromTo(
          ".hero-foot",
          { opacity: 1 },
          {
            opacity: 0,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: hero, start: "top top", end: "+=220", scrub: 0.6 },
          },
        );
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(
          ".hero-title-line, .hero-eyebrow, .hero-tagline, .hx-fact, .hero-actions, .hx-meta, .hero-foot",
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
    <section className="hero hero--home" ref={heroRef}>
      <picture className="hero-bg-wrap">
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
      <div className="film film--vignette" aria-hidden="true" />
      <div className="wrap hero-in">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">
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
                  width={1086}
                  height={385}
                  fetchPriority="high"
                  draggable={false}
                  onLoad={() => setTitleLoaded(true)}
                />
              </span>
            </h1>
          </div>
      
          <div className="hx-strip">
            <div className="hx-fact hx-fact--left">
              <span className="hx-label">Online qualifier</span>
              <span className="hx-value">{shortDate(EVENT.qualifierDate)}</span>
              <span className="hx-sub">{EVENT.qualifierTime}</span>
            </div>
            <PrizePoolBadge />
            <div className="hx-fact hx-fact--right">
              <span className="hx-label">Offline finale</span>
              <span className="hx-value">{shortDate(EVENT.offlineDate)}</span>
              <span className="hx-sub">24 hours · BMSIT&amp;M</span>
            </div>
          </div>
          <p className="visually-hidden">{EVENT.description}</p>
          <div className="cta-row center hero-actions">
            <RegisterButton to="/register" />
          </div>
          <p className="hx-meta">
            Teams of {EVENT.teamSize} <i aria-hidden="true">/</i> Registration closes{" "}
            {shortDate(EVENT.registrationDeadline)}
          </p>
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
