import { useRef } from "react";
import { CalendarDays, IndianRupee, Laptop, MapPin, ShieldCheck, Users } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { PageHeader, RegistrationCTA } from "../components/sections/Blocks";
import { ScrollReveal, SectionHeading } from "../components/ui";
import { ANNOUNCING, EVENT, TBA, isSet } from "../config/event";
import { useTitle } from "../hooks";
import { gsap, ScrollTrigger } from "../animations/gsap";
import { Marquee } from "../components/sections/Marquee";

const OBJECTIVES = [
  "Take part in a Signal Processing Based Capture the Flag (CTF) Challenge.",
  "Participate as a team of 2–4 members.",
  "Join the online qualifier on 22 November 2026.",
  "The top 30 teams from the online round advance to the offline challenge.",
  "Compete in the 24-hour offline challenge at BMS Institute of Technology and Management.",
];

export default function AboutPage() {
  useTitle(`About | ${EVENT.name}`);
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
      <PageHeader kicker="DECODEX / ABOUT" title="About the challenge"
        intro={EVENT.description}
      />

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
              Teams of 2–4 students pursuing bachelor's degrees can participate in an online qualifier
              followed by an offline challenge.
            </p>
            <p className="body">
              The online qualifier takes place on 22 November 2026 from 10:00 AM to 12:00 PM. The top
              30 teams advance to the 24-hour offline challenge on 27–28 November 2026 at BMS Institute
              of Technology and Management, Bengaluru.
            </p>
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
            intro="The event is for students pursuing bachelor's degrees, in teams of 2–4 members."
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
                <p>{TBA(EVENT.department, "Department")}</p>
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
                  <dd>{TBA(EVENT.studentCoordinators, "Student coordinators")}</dd>
                </div>
                <div>
                  <dt>Contact</dt>
                  <dd>{contact || ANNOUNCING}</dd>
                </div>
              </dl>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <RegistrationCTA />
    </>
  );
}
