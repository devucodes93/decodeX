import { Hero } from "../components/sections/Hero";
import { AboutHero } from "../components/sections/AboutHero";
import { EVENT } from "../config/event";
import { useTitle } from "../hooks";

export default function HomePage() {
  useTitle(`${EVENT.name} | Signal Processing CTF Challenge`);
  return (
    <>
      <Hero />
      <AboutHero variant="section" />
    </>
  );
}
