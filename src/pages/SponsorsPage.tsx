import { PageHeader, SponsorGroups, PartnerCTA } from "../components/sections/Blocks";
import { EVENT } from "../config/event";
import { useTitle } from "../hooks";

export default function SponsorsPage() {
  useTitle(`Sponsors | ${EVENT.name}`);
  return (
    <>
      <PageHeader kicker="DECODEX / SUPPORT" title="Sponsors and partners"
        intro="Sponsors and partners help the organizers provide a well-run event, mentoring and recognition for participants. Only confirmed organizations are listed on this page."
      />
      <section className="sec light sponsors-page">
        <div className="wrap">
          <SponsorGroups />
          <PartnerCTA />
        </div>
      </section>
    </>
  );
}
