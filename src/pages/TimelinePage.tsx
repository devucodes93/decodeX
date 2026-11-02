import EventJourneyMap from "../components/EventJourneyMap";
import { RegistrationCTA } from "../components/sections/Blocks";
import { ASSETS } from "../config/assets";
import { EVENT } from "../config/event";
import { useTitle } from "../hooks";

export default function TimelinePage() {
  useTitle(`Timeline | ${EVENT.name}`);
  return (
    <>
      <div className="timeline-cinematic">
        <div className="timeline-sticky-bg" aria-hidden="true">
          <img src={ASSETS.gtaCity} alt="" />
        </div>
        <EventJourneyMap />
      </div>
      <RegistrationCTA />
    </>
  );
}
