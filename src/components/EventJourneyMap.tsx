import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "../animations/gsap";
import { TIMELINE } from "../data/timeline";
import JourneyEventCard from "./JourneyEventCard";
import "./EventJourneyMap.css";

const EVENTS = TIMELINE.map((event, index) => ({
  ...event,
  number: String(index + 1).padStart(2, "0"),
}));

export default function EventJourneyMap() {
  const sectionRef = useRef<HTMLElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;

      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const heading = section.querySelector<HTMLElement>(".journey-heading");
        const timeline =
          section.querySelector<HTMLElement>(".journey-timeline");
        const entries = gsap.utils.toArray<HTMLElement>(
          ".journey-entry",
          section,
        );

        if (heading) {
          gsap.from(heading.children, {
            y: 22,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: {
              trigger: heading,
              start: "top 88%",
              once: true,
            },
          });
        }

        if (lineRef.current && timeline) {
          gsap.fromTo(
            lineRef.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: timeline,
                start: "top 72%",
                end: "bottom 76%",
                scrub: 0.8,
                invalidateOnRefresh: true,
              },
            },
          );
        }

        if (entries.length) {
          const cardTl = gsap.timeline({
            scrollTrigger: {
              trigger: timeline,
              start: "top 82%",
              end: "bottom 60%",
              scrub: 1,
              invalidateOnRefresh: true,
              once: false,
            },
          });

          entries.forEach((entry) => {
            const card = entry.querySelector<HTMLElement>(".journey-card");
            const marker = entry.querySelector<HTMLElement>(".journey-marker");

            cardTl.fromTo(
              card,
              { y: 26, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.7,
                ease: "power3.out",
              },
              "<0.15",
            );

            if (marker) {
              cardTl.fromTo(
                marker,
                { scale: 0, autoAlpha: 0 },
                {
                  scale: 1,
                  autoAlpha: 1,
                  duration: 0.5,
                  ease: "back.out(1.7)",
                },
                "<0.1",
              );
            }

            ScrollTrigger.create({
              trigger: entry,
              start: "top 68%",
              end: "bottom 32%",
              toggleClass: { targets: entry, className: "is-active" },
            });
          });
        }

        return () => {
          ScrollTrigger.getAll().forEach((trigger) => {
            if (
              trigger.vars.trigger === timeline ||
              trigger.vars.trigger === heading
            ) {
              trigger.kill();
            }
          });
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".journey-heading > *, .journey-card", { clearProps: "all" });
        if (lineRef.current) {
          gsap.set(lineRef.current, { scaleY: 1 });
        }
      });

      let mounted = true;
      document.fonts?.ready.then(() => {
        if (mounted) ScrollTrigger.refresh();
      });

      return () => {
        mounted = false;
        media.revert();
      };
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="journey-section"
      aria-labelledby="journey-title"
    >
      <div className="journey-ambient" aria-hidden="true" />

      <div className="journey-wrap">
        <header className="journey-heading">
          <p className="journey-eyebrow">Event timeline</p>
          <div className="journey-heading-row">
            <h1 id="journey-title">
              Every stage,
              <br />
              <span>clearly mapped.</span>
            </h1>
            <p className="journey-subtitle">
              From the first registration window to the final offline build,
              here is how DecodeX unfolds.
            </p>
          </div>
        </header>

        <div className="journey-timeline">
          <div className="journey-line" aria-hidden="true">
            <span ref={lineRef} className="journey-line-progress" />
          </div>

          <ol className="journey-list">
            {EVENTS.map((event, index) => (
              <li
                key={`${event.title}-${index}`}
                className={`journey-entry ${
                  index % 2 === 0
                    ? "journey-entry--left"
                    : "journey-entry--right"
                }`}
              >
                <span className="journey-marker" aria-hidden="true">
                  <span />
                </span>
                <JourneyEventCard event={event} index={index} />
              </li>
            ))}
          </ol>
        </div>

        <footer className="journey-finish">
          <p className="journey-finish-kicker">Schedule confirmed</p>
          <h2>See you at the challenge.</h2>
          <p>
            Any updates will be shared through the official DecodeX channels.
          </p>
        </footer>
      </div>
    </section>
  );
}
