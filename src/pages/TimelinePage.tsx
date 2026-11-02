import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import EventJourneyMap from "../components/EventJourneyMap";
import { RegistrationCTA } from "../components/sections/Blocks";
import { ASSETS } from "../config/assets";
import { EVENT } from "../config/event";
import { useTitle } from "../hooks";
import { gsap } from "../animations/gsap";

export default function TimelinePage() {
  const timelineRef = useRef<HTMLDivElement>(null);
  useTitle(`Timeline | ${EVENT.name}`);

  useGSAP(
    () => {
      const section = timelineRef.current;
      const image = section?.querySelector<HTMLElement>(
        ".timeline-sticky-bg img",
      );
      const cta = section?.querySelector<HTMLElement>(".rcta");

      if (!image || !cta) return;

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          image,
          { objectPosition: "center top" },
          {
            objectPosition: "center 10%",
            ease: "none",
            scrollTrigger: {
              trigger: cta,
              start: "top bottom",
              end: "top 35%",
              scrub: 1,
            },
          },
        );
      });

      return () => media.revert();
    },
    { scope: timelineRef },
  );

  return (
    <>
      <div className="timeline-cinematic" ref={timelineRef}>
        <div className="timeline-sticky-bg" aria-hidden="true">
          <picture>
            <source media="(max-width: 700px)" srcSet={ASSETS.gtaPhone} />
            <img src={ASSETS.gtaCity} alt="" />
          </picture>
        </div>
        <EventJourneyMap />
        <RegistrationCTA />
      </div>
    </>
  );
}
