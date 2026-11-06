import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { RegistrationCTA } from "../components/sections/Blocks";
import { ScrollReveal } from "../components/ui";
import { EVENT, TBA, isSet } from "../config/event";
import { useTitle } from "../hooks";
import { gsap, isTouch, ScrollTrigger, SCRUB } from "../animations/gsap";
import { Marquee } from "../components/sections/Marquee";
import { AboutHero } from "../components/sections/AboutHero";
import { MissionDeck, type Mission } from "../components/MissionDeck";
import "./AboutPage.css";
import { TitleArt } from "../components/ui/TitleArt";
import { MissionLobby, type LobbyItem } from "../components/MissionLobby";

const OBJECTIVES = [
  "Promote the practical application of signal processing concepts beyond the classroom.",
  "Introduce students to CTF-style competition in the signal processing domain.",
  "Build analytical thinking, problem-solving and teamwork under time pressure.",
  "Give students from colleges across the country a platform to compete and network.",
  "Encourage interest in emerging areas like AI/ML for signal processing, biomedical signals and radar sensing.",
  "Connect students with industry sponsors and the wider IEEE community.",
];

const EXPECT: Mission[] = [
  {
    title: "Real-world signals",
    codename: "Signal intercept",
    body: "Challenges built on audio, biomedical, radar and sensor data, with puzzles that need real signal processing, not guesswork.",
    meta: ["Signal processing", "Audio / radar / sensor"],
    image: "/assets/missions/01-signals.jpg",
  },
  {
    title: "Hands-on flag hunting",
    codename: "Field objective",
    body: "Each challenge hides a flag inside a signal or dataset. Work out what you're dealing with, pick the right signal processing or ML technique, and extract the answer.",
    meta: ["Capture the flag", "Find / extract"],
    image: "/assets/missions/02-flag.jpg",
  },
  {
    title: "Rising difficulty",
    codename: "Escalation",
    body: "Start with approachable puzzles and work up to harder, multi-stage ones.",
    meta: ["Difficulty: rising", "Multi-stage"],
    image: "/assets/missions/03-difficulty.jpg",
  },
  {
    title: "Two rounds",
    codename: "Final operation",
    body: `An online qualifier on ${EVENT.qualifierDate} (${EVENT.qualifierTime}), then a 24-hour offline challenge on ${EVENT.offlineDate} at BMSIT&M.`,
    meta: ["2 rounds", "24-hour finale"],
    image: "/assets/missions/04-rounds.jpg",
  },
];

export default function AboutPage() {
  useTitle(`Mission Briefing | ${EVENT.name}`);
  const purposeRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  // Full values come from src/config/event.ts; `short` is the compact text
  // shown in the menu row.
  const details: LobbyItem[] = [
    {
      label: "Eligibility",
      short: "Bachelor's students",
      value: TBA(EVENT.eligibility, "Eligibility"),
      tag: "Player requirements",
      icon: "graduation",
    },
    {
      label: "Team size",
      short: TBA(EVENT.teamSize, "TBA"),
      value: TBA(EVENT.teamSize, "Team size"),
      tag: "Crew size",
      icon: "users",
    },
    {
      label: "Venue",
      short: "BMSIT&M",
      value: TBA(EVENT.venue, "Venue"),
      tag: "Location",
      icon: "pin",
    },
    {
      label: "Mode",
      short: "Online + offline",
      value: `${EVENT.mode}
${EVENT.duration}`,
      tag: "Mission type",
      icon: "monitor",
    },
    {
      label: "Event date",
      short: "22, 27–28 Nov",
      value: TBA(EVENT.dateLabel, "Date"),
      tag: "Schedule",
      icon: "calendar",
    },
    {
      label: "Registration fee",
      short: "Qualifier free",
      value: "Qualifier round: free\nTop 30 teams: ₹1,000–₹1,500",
      details: [...EVENT.feeTiers.map((t) => `${t.label}: ${t.amount}`), "Paid only by the top 30 qualified teams."],
      tag: "Buy-in",
      icon: "ticket",
    },
  ];

  // Shared hero + purpose artwork: slow parallax drift across the stage.
  useGSAP(() => {
    const stage = purposeRef.current?.closest<HTMLElement>(".about-stage");
    const bg = stage?.querySelector<HTMLElement>(".about-stage-bg");
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Phones/tablets: static artwork. Laptops: locked to the scroll.
      if (!stage || !bg || isTouch()) return;
      gsap.fromTo(
        bg,
        { yPercent: 0 },
        {
          yPercent: 8,
          ease: "none",
          force3D: true,
          scrollTrigger: { trigger: stage, start: "top top", end: "bottom top", scrub: SCRUB },
        },
      );
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, { dependencies: [] });

  return (
    <>
      {/* One artwork spans the hero AND the purpose section. */}
      <div className="about-stage">
        <img
          className="about-stage-bg"
          src="/assets/photos/GTA4.jpg"
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
        />
        <div className="about-stage-scrim" aria-hidden="true" />
        <div className="film" aria-hidden="true" />

      <AboutHero sharedBackground />

      <section className="sec about-purpose about-purpose--on-art" ref={purposeRef}>
        <div className="wrap two">
          <ScrollReveal>
            <p className="kicker">Purpose</p>
            <h2 className="big">
              <TitleArt text="A Signal Processing Based CTF Challenge." />
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.12}>
            <p className="lede">
              DecodeX '26 is a signal processing competition in the style of a CTF
              (Capture The Flag), participants decode hidden messages and secrets buried
              inside real world signals, using filtering, spectral analysis, demodulation
              and machine learning. Every flag is earned by actually working with the data.
            </p>
          </ScrollReveal>
        </div>
      </section>
      </div>

      <section className="expect">
        <div className="expect-bg" aria-hidden="true" />
        <div className="wrap">
          <div className="expect-head">
            <p className="expect-kicker">What to expect</p>
            <h2 className="expect-title">
              <TitleArt text="Inside the mission" />
            </h2>
            <p className="expect-hint">
              <span className="expect-hint--hover">Hover over a card to reveal it</span>
              <span className="expect-hint--touch">Scroll to reveal each mission</span>
            </p>
          </div>
          <MissionDeck missions={EXPECT} />
        </div>
      </section>

      <Marquee />

      <section className="sec dark about-objectives">
        <div className="wrap two">
          <div>
            <p className="kicker">Objectives</p>
            <h2 className="big">
              <TitleArt text="What the event aims to do." />
            </h2>
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

      <section className="brief" ref={detailsRef}>
        <div className="wrap">
          <div className="brief-head">
            <p className="brief-kicker">Participation</p>
            <h2 className="brief-title">
              <TitleArt text="Eligibility & event format" />
            </h2>
          </div>
          <MissionLobby items={details} />
        </div>
      </section>

      <RegistrationCTA hasBg={true} />
    </>
  );
}
