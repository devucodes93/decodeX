import { useRef } from "react";
import { CalendarDays, IndianRupee, Laptop, MapPin, ShieldCheck, Users } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { RegistrationCTA } from "../components/sections/Blocks";
import { ScrollReveal, SectionHeading } from "../components/ui";
import { ANNOUNCING, EVENT, TBA, isSet } from "../config/event";
import { useTitle } from "../hooks";
import { gsap, ScrollTrigger } from "../animations/gsap";
import { Marquee } from "../components/sections/Marquee";
import { useAboutAnimation } from "../animations/useAboutAnimation";
import AboutHazardTape from "../components/AboutHazardTape";

const OBJECTIVES = [
  "Promote the practical application of signal processing concepts beyond the classroom.",
  "Introduce students to CTF-style competition in the signal processing domain.",
  "Build analytical thinking, problem-solving and teamwork under time pressure.",
  "Give students from colleges across the country a platform to compete and network.",
  "Encourage interest in emerging areas like AI/ML for signal processing, biomedical signals and radar sensing.",
  "Connect students with industry sponsors and the wider IEEE community.",
];

export default function AboutPage() {
  useTitle(`About | ${EVENT.name}`);
  const container = useAboutAnimation();
  const purposeRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const contact = [EVENT.contact.person, EVENT.contact.email, EVENT.contact.phone]
    .filter(isSet)
    .join(" \u00B7 ");
  const details = [
    { icon: ShieldCheck, label: "Eligibility", value: TBA(EVENT.eligibility, "Eligibility") },
    { icon: Users, label: "Team size", value: TBA(EVENT.teamSize, "Team size") },
    { icon: MapPin, label: "Venue", value: TBA(EVENT.venue, "Venue") },
    { icon: Laptop, label: "Mode", value: `${EVENT.mode}; ${EVENT.duration}` },
    { icon: CalendarDays, label: "Event date", value: TBA(EVENT.dateLabel, "Date") },
    { icon: IndianRupee, label: "Registration fee", value: TBA(EVENT.fee, "Fee") },
  ];

  useGSAP(() => {
    const section = detailsRef.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".reveal-tile", {
        y: 55,
        opacity: 0,
        scale: 0.96,
        duration: 0.85,
        stagger: { amount: 0.7, from: "start" },
        ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 78%", once: true },
      });
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, { scope: detailsRef });

  useGSAP(() => {
    const section = purposeRef.current;
    if (!section) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const layers = Array.from(
        section.querySelectorAll<HTMLElement>(".parallax-background [data-speed]")
      );
      layers.forEach((layer) => {
        const speed = Number(layer.dataset.speed || 0.1);
        gsap.to(layer, {
          y: () => -window.innerHeight * speed,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });
      });
    });
    return () => mm.revert();
  }, { scope: purposeRef });

  return (
    <>
      <div className="about-hero" ref={container}>
        <img
          className="about-bg-img"
          src="/assets/photos/GTA4.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
        />
        <div className="about-scrim" aria-hidden="true" />
        <img
          src="/assets/photos/char1.png"
          className="about-character"
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />

        <div className="about-hero-content">
          <span className="about-warning-label">DECODEX / ABOUT</span>
          <h1 className="about-heading">About the challenge</h1>
          <p className="about-description">{EVENT.description}</p>
          <AboutHazardTape label="SIGNAL INVESTIGATION" />
        </div>
      </div>

      <section className="sec light about-purpose" ref={purposeRef}>
        <div className="parallax-background" aria-hidden="true">
          <span className="parallax-glow glow-one" data-speed="0.12" />
          <span className="parallax-glow glow-two" data-speed="0.2" />
          <span className="parallax-ring" data-speed="0.08" />
        </div>
        <div className="wrap two">
          <ScrollReveal>
            <p className="kicker">Purpose</p>
            <h2 className="big">A Signal Processing Based CTF Challenge.</h2>
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <p className="lede">
              DecodeX '26 is a signal processing competition in the style of a CTF
              (Capture The Flag), participants decode hidden messages and secrets buried
              inside real world signals, using filtering, spectral analysis, demodulation
              and machine learning. Every flag is earned by actually working with the data.
            </p>
            <p className="body"><strong>What to Expect:</strong></p>
            <ul className="ticks">
              <li>
                <strong>Challenges on real world signals:</strong> Audio, biomedical,
                radar and sensor data, with puzzles that need real signal processing, not
                guesswork.
              </li>
              <li>
                <strong>Hands-on problem solving:</strong> Each challenge hides a flag
                inside a signal or dataset. Participants identify what they're dealing
                with, pick the right signal processing or ML technique, and extract the
                answer.
              </li>
              <li>
                <strong>Rising difficulty:</strong> Start with approachable puzzles and
                work up to harder multi-stage ones.
              </li>
            </ul>
          </ScrollReveal>
        </div>
      </section>

      <Marquee />

      <section className="sec dark about-objectives">
        <div className="wrap two">
          <div>
            <p className="kicker">Objectives</p>
            <h2 className="big">What the event aims to do.</h2>
          </div>
          <ul className="ticks">
            {OBJECTIVES.map((objective) => (
              <li key={objective}>
                <ScrollReveal>{objective}</ScrollReveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sec light about-details" ref={detailsRef}>
        <div className="wrap">
          <SectionHeading
            kicker="Participation"
            title="Eligibility and event format"
            intro=""
          />
          <div className="info-grid">
            {details.map(({ icon: Icon, label, value }) => (
              <div className="info-card reveal-tile" key={label}>
                <Icon size={22} />
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec light alt about-organizers">
        <div className="wrap">
          <SectionHeading kicker="Organizers" title="Who organises the event" />
          <div className="organizers">
            <ScrollReveal>
              <div className="org-card">
                <h3>Organizing committee</h3>
                <p>{TBA(EVENT.organizer, "Organizing committee")}</p>
                <p>{TBA(EVENT.college, "Host college")}</p>
                
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <dl className="details">
                <div>
                  <dt>Faculty coordinator</dt>
                  <dd>{TBA(EVENT.facultyCoordinator, "Faculty coordinator")}</dd>
                </div>
                <div>
                  <dt>Student coordinators</dt>
                  <dd>
                    <a href="tel:+916364744793">
                      {TBA(EVENT.studentCoordinators, "Student coordinators")}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>
                    <a href="tel:+919606802529">
                      {contact || ANNOUNCING}
                    </a>
                  </dd>
                </div>
              </dl>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <RegistrationCTA hasBg={true} />
    </>
  );
}
