import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { RegistrationCTA } from "../components/sections/Blocks";
import { Marquee } from "../components/sections/Marquee";
import { EVENT } from "../config/event";
import { COLLABORATORS } from "../data/collaborators";
import { useTitle } from "../hooks";
import { gsap, ScrollTrigger } from "../animations/gsap";
import "./CollaborationPage.css";
import { TitleArt } from "../components/ui/TitleArt";

export default function CollaborationPage() {
  useTitle(`Collaboration | ${EVENT.name}`);
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".crew-head > *", {
          y: 30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        });
        gsap.from(".crew-card", {
          y: 50,
          opacity: 0,
          duration: 0.75,
          stagger: 0.09,
          delay: 0.25,
          ease: "power3.out",
        });
      });
      document.fonts?.ready.then(() => ScrollTrigger.refresh());
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <>
      <section className="crew-page" ref={sectionRef}>
        <img className="crew-bg" src="/assets/photos/GTA3-1920.jpg" alt="" aria-hidden="true" />
        <div className="crew-scrim" aria-hidden="true" />

        <div className="wrap crew-head">
          <p className="crew-kicker">Collaboration</p>
          <h1 className="crew-title">
            <TitleArt text="Crew Allies" size="page" />
          </h1>
          <p className="crew-intro">
            Together with these organisations, we create a platform for innovation and learning
            in signal processing.
          </p>
        </div>

        <ul className="wrap crew-grid">
          {COLLABORATORS.map((c, i) => (
            <li className="crew-card" key={c.name}>
              <span className="crew-ring">
                <span className="crew-logo">
                  <img src={c.logo} alt={`${c.name} logo`} width={600} height={600} loading="lazy" />
                </span>
              </span>
              <h2 className="crew-name">{c.name}</h2>
              <p className="crew-role">{c.role}</p>
              <span className="crew-index" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Marquee />
      <RegistrationCTA hasBg={true} />
    </>
  );
}
