import type { FAQItem } from "../types";
import { ANNOUNCING, EVENT, isSet } from "../config/event";

const value = (input: string, fallback: string) => (isSet(input) ? input : fallback);
const contact = () => {
  const parts = [EVENT.contact.email, EVENT.contact.phone].filter(isSet);
  return parts.length
    ? `You can contact the organizing team at ${parts.join(" or ")}.`
    : "The official contact details will be published on this website before registration closes.";
};

export const FAQ: FAQItem[] = [
  {
    q: "Who can participate?",
    a: value(
      EVENT.eligibility,
      "Eligibility will be announced by the organizers. The official rules will state which courses, years and institutions are eligible.",
    ),
  },
  {
    q: "How many members can a team have?",
    a: value(
      EVENT.teamSize,
      "Team size will be announced with the official rules. Please do not register until the allowed team size is published.",
    ),
  },
  {
    q: "Is there a registration fee?",
    a: value(
      EVENT.fee,
      "The registration fee has not been announced. Any fee and payment process will be published on the registration page.",
    ),
  },
  {
    q: "What is the registration deadline?",
    a: value(
      EVENT.registrationDeadline,
      "The registration deadline will be announced. The official deadline will also appear on the registration page.",
    ),
  },
  {
    q: "What is the event?",
    a: EVENT.description,
  },
  {
    q: "What is the event format?",
    a: "There is an online qualifier followed by an offline challenge. The top 30 teams qualifying from the online round advance to the offline challenge.",
  },
  {
    q: "Where and how will the event take place?",
    a: `The online qualifier is on ${EVENT.qualifierDate} from ${EVENT.qualifierTime}. The offline challenge is on ${EVENT.offlineDate} at ${EVENT.venue}.`,
  },
  {
    q: "What should I bring?",
    a: "Any participant instructions beyond the confirmed event schedule will be shared by the organizers.",
  },
  {
    q: "What are the challenge categories?",
    a: "Challenge categories and further technical details have not been announced.",
  },
  {
    q: "Are certificates provided?",
    a: "Certificate details have not been confirmed.",
  },
  {
    q: "When will registration open and close?",
    a: `Registration opens ${EVENT.registrationOpens} and closes ${EVENT.registrationDeadline}.`,
  },
  {
    q: "Whom should I contact for help?",
    a: contact(),
  },
];
