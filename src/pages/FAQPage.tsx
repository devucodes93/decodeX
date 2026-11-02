import { Mail, Phone } from "lucide-react";
import { PageHeader, FAQAccordion, RegistrationCTA } from "../components/sections/Blocks";
import { FAQ } from "../data/faq";
import { EVENT, isSet } from "../config/event";
import { CharacterImage } from "../components/ui";
import { useTitle } from "../hooks";

export default function FAQPage() {
  useTitle(`FAQ | ${EVENT.name}`);
  const hasContact = isSet(EVENT.contact.email) || isSet(EVENT.contact.phone);
  return (
    <>
      <section className="faq-hero">
        <PageHeader
          kicker="DECODEX / HELP DESK"
          title="Frequently asked questions"
          intro="Confirmed information about eligibility, teams, registration, and the online and offline challenge schedule."
        />
        <CharacterImage src="/assets/photos/char2.png" alt="Help desk character" side="right" variant="faq" />
      </section>
      <section className="sec light faq-page">
        <div className="wrap narrow">
          <FAQAccordion items={FAQ} />
          <div className="contact-box">
            <h2>Still have a question?</h2>
            <p>
              {hasContact
                ? "Contact the organizing committee for clarification before the event."
                : "Official contact details will be published on this website. Until then, please rely on the organizers' verified communications."}
            </p>
            <div className="contact-links">
              {isSet(EVENT.contact.email) && (
                <a href={`mailto:${EVENT.contact.email}`}>
                  <Mail size={16} /> {EVENT.contact.email}
                </a>
              )}
              {isSet(EVENT.contact.phone) && (
                <a href={`tel:${EVENT.contact.phone}`}>
                  <Phone size={16} /> {EVENT.contact.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
      <RegistrationCTA hasBg={true} />
    </>
  );
}
