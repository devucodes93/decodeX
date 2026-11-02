import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { RegistrationCTA } from "../components/sections/Blocks";
import { Marquee } from "../components/sections/Marquee";
import { EVENT } from "../config/event";
import { COLLABORATORS } from "../data/collaborators";
import { useTitle } from "../hooks";
import { gsap, ScrollTrigger } from "../animations/gsap";

export default function CollaborationPage() {
  useTitle(`Collaboration | ${EVENT.name}`);
  const sectionRef = useRef<HTMLElement>(null);
  const showcaseRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".collaboration-head > *", {
        y: 34,
        opacity: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".collaborator-card", {
        y: 42,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: {
          trigger: showcaseRef.current,
          start: "top 68%",
          once: true,
        },
      });
    });

    mm.add("(min-width: 769px) and (prefers-reduced-motion: no-preference)", () => {
      const showcase = showcaseRef.current;
      const track = trackRef.current;
      if (!showcase || !track) return;

      const distance = () =>
        Math.max(0, track.scrollWidth - document.documentElement.clientWidth);

      if (!distance()) return;

      gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: showcase,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => mm.revert();
  }, { scope: sectionRef });

  return (
    <>
      <section className="collaboration-page" ref={sectionRef}>
        <div className="collaboration-showcase" ref={showcaseRef}>
          <div className="wrap collaboration-head">
            <p className="kicker">DECODEX / COLLABORATION</p>
            <div className="collaboration-heading-row">
              <h1>In Collaboration With</h1>
              <p>
                Together with these prestigious organizations, we create an unparalleled platform
                for innovation and learning in signal processing.
              </p>
            </div>
          </div>
          <div className="collaborators-viewport">
            <ul className="collaborators-track" ref={trackRef}>
              {COLLABORATORS.map((collaborator, index) => (
                <li className="collaborator-card" key={collaborator.name}>
                  <span className="collaborator-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="collaborator-logo">
                    <img
                      src={collaborator.logo}
                      alt={`${collaborator.name} logo`}
                      width={640}
                      height={280}
                      loading="lazy"
                    />
                  </div>
                  <div className="collaborator-meta">
                    <h2>{collaborator.name}</h2>
                    <span>Collaborating organization</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Marquee />
      <RegistrationCTA hasBg={true} />
    </>
  );
}
