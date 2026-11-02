import { Hero } from "../components/sections/Hero";
import { EVENT } from "../config/event";
import { useTitle } from "../hooks";

export default function HomePage() {
  useTitle(`${EVENT.name} | Signal Processing CTF Challenge`);
  return <Hero />;
}
