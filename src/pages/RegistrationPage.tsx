import {
  Calendar,
  Clock,
  IndianRupee,
  Laptop,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { PageHeader } from "../components/sections/Blocks";
import { PrimaryButton, ScrollReveal } from "../components/ui";
import { EVENT, TBA, isSet } from "../config/event";
import { useTitle } from "../hooks";

const CHECKLIST = [
  "Review the confirmed eligibility and team size.",
  "Confirm your team size and collect your teammates' details.",
  "Register between 03 November 2026 and 20 November 2026.",
  "Use the official registration link when it is published.",
];

export default function RegistrationPage() {
  useTitle(`Register | ${EVENT.name}`);
  const live = Boolean(EVENT.registrationUrl);

  const facts = [
    { icon: Calendar, label: "Event date", value: TBA(EVENT.dateLabel, "Date") },
    { icon: Clock, label: "Registration deadline", value: TBA(EVENT.registrationDeadline, "Deadline") },
    { icon: Users, label: "Team size", value: TBA(EVENT.teamSize, "Team size") },
    { icon: IndianRupee, label: "Registration fee", value: TBA(EVENT.fee, "Fee") },
    { icon: MapPin, label: "Venue", value: TBA(EVENT.venue, "Venue") },
    { icon: Laptop, label: "Mode", value: TBA(EVENT.mode, "Mode") },
    { icon: Trophy, label: "Prize pool", value: TBA(EVENT.prizePool, "Prize pool") },
    { icon: ShieldCheck, label: "Eligibility", value: TBA(EVENT.eligibility, "Eligibility") },
  ];

  return (
    <>
      <PageHeader kicker="DECODEX / APPLY" title="Register for the challenge"
        intro={`Registration opens ${EVENT.registrationOpens} and closes ${EVENT.registrationDeadline}. The Unstop registration URL has not been confirmed; registration is not yet live.`}
      />
      <section className="sec light reg">
        <div className="wrap two">
          <ScrollReveal>
            <h2>Registration details</h2>
            <ul className="facts">
              {facts.map(({ icon: Icon, label, value }) => (
                <li key={label}>
                  <Icon size={18} />
                  <span>
                    <b>{label}:</b> {value}
                  </span>
                </li>
              ))}
            </ul>
            {(EVENT.contact.email || EVENT.contact.phone) && (
              <p className="body">
                Questions about registration? Contact{" "}
                {[EVENT.contact.person, EVENT.contact.email, EVENT.contact.phone]
                  .filter(isSet)
                  .join(" · ")}
                .
              </p>
            )}
          </ScrollReveal>

          <ScrollReveal delay={0.12}>
            <h2>How to register</h2>
            <ol className="how">
              <li>Read the official event rules and eligibility criteria.</li>
              <li>Form a team within the allowed team size.</li>
              <li>Open the official registration link when it is published.</li>
              <li>Complete the form and watch for confirmation from the organizers.</li>
            </ol>
            <PrimaryButton href={EVENT.registrationUrl} disabled={!live}>
              {live ? "Open the official registration form" : "Registration link coming soon"}
            </PrimaryButton>
            {live ? (
              <p className="note">
                The link opens the official registration page in a new tab. This website does not collect
                applications or personal data.
              </p>
            ) : (
              <p className="note">
                The official Unstop registration link has not been provided yet. This website does not collect
                applications or personal data.
              </p>
            )}

            <h2 className="mt">Before you register</h2>
            <ul className="ticks dk">
              {CHECKLIST.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
