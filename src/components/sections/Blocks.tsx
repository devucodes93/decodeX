import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ANNOUNCING, EVENT } from "../../config/event";
import { TIERS } from "../../data/sponsors";
import { PRIZES, PRIZES_ANNOUNCED, SPECIAL_AWARDS } from "../../data/prizes";
import { PREVIOUS_EDITION } from "../../data/previousEdition";
import type { FAQItem, Partner } from "../../types";
import { ASSETS } from "../../config/assets";
import { AnimatedAmount, Img, PrimaryButton, ScrollReveal, SectionHeading } from "../ui";
import { TitleArt } from "../ui/TitleArt";

export const PageHeader = ({
  title,
  intro,
  kicker = "DECODEX / FIELD NOTES",
}: {
  title: string;
  intro: string;
  kicker?: string;
}) => (
  <section className="phead">
    <img className="phead-bg" src={ASSETS.gtaCity} alt="" aria-hidden="true" loading="eager" fetchPriority="high" />
    <div className="phead-scrim" aria-hidden="true" />
    <div className="grain" aria-hidden="true" />
    <div className="wrap">
      <p className="kicker">{kicker}</p>
      <motion.h1 initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}>
        <TitleArt text={title} size="page" />
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18, duration: 0.55 }}>
        {intro}
      </motion.p>
    </div>
  </section>
);

export function PrizeGrid() {
  if (!PRIZES_ANNOUNCED) {
    return (
      <div className="prize-pending">
        <span className="kicker">Prize pool</span>
        <b><AnimatedAmount value={EVENT.prizePool || ANNOUNCING} /></b>
        <p>
          {EVENT.prizePool
            ? "Total prize pool. Individual prize distributions have not been announced."
            : "The organizing committee will publish the prize pool and special awards when they are confirmed."}
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="prizes">
        {PRIZES.map((prize, index) => (
          <div key={prize.label} className={`prize ${prize.highlight ? "first" : ""}`}>
            <span className="prize-rank" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <small>{prize.label}</small>
            <b><AnimatedAmount value={prize.amount || ANNOUNCING} /></b>
            <span className="prize-line" aria-hidden="true" />
          </div>
        ))}
      </div>
      {SPECIAL_AWARDS.length > 0 && (
        <div className="special-awards">
          <h3>Special awards</h3>
          <ul className="ticks">
            {SPECIAL_AWARDS.map((award) => (
              <li key={award}>{award}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function PreviousEditionSection() {
  const { verified, label, summary, highlights, stats } = PREVIOUS_EDITION;
  if (!verified || (!summary && highlights.length === 0 && stats.length === 0)) return null;
  return (
    <section className="sec dark">
      <div className="wrap">
        <SectionHeading
          kicker="Previous edition"
          title={label ? `Highlights from ${label}` : "Highlights from the previous edition"}
          intro={summary || undefined}
        />
        {stats.length > 0 && (
          <div className="prev-stats">
            {stats.map((stat) => (
              <div key={stat.label} className="prev-stat">
                <b>{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        )}
        {highlights.length > 0 && (
          <ul className="prev-list">
            {highlights.map((item) => (
              <li key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export const SponsorCard = ({ p }: { p: Partner }) => {
  const inner = (
    <>
      {p.logo ? <Img src={p.logo} alt={p.name} /> : <span className="mono">{p.name.slice(0, 2)}</span>}
      <b>{p.name}</b>
    </>
  );
  return p.url ? (
    <a className="spon" href={p.url} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <div className="spon">{inner}</div>
  );
};

export function SponsorGroups() {
  const tiers = TIERS.filter((tier) => tier.partners.length);
  if (!tiers.length) {
    return (
      <div className="empty">
        <h3>Sponsors and partners will be announced.</h3>
        <p>
          Confirmed organizations will be listed here before the event. Sponsorship enquiries can be sent
          to the organizing committee.
        </p>
      </div>
    );
  }
  return (
    <>
      {tiers.map((tier) => (
        <ScrollReveal key={tier.name} className="tier">
          <h3>{tier.name}</h3>
          <div className="spgrid">
            {tier.partners.map((partner) => (
              <SponsorCard key={partner.name} p={partner} />
            ))}
          </div>
        </ScrollReveal>
      ))}
    </>
  );
}

export const PartnerCTA = () => (
  <div className="partner-cta">
    <h3>Interested in supporting this event?</h3>
    <p>
      Organizations can contact the organizing committee about supporting the event.
    </p>
    <PrimaryButton
      href={
        EVENT.contact.email
          ? `mailto:${EVENT.contact.email}?subject=Partnership%20enquiry%20for%20${encodeURIComponent(EVENT.name)}`
          : undefined
      }
      disabled={!EVENT.contact.email}
    >
      {EVENT.contact.email ? "Contact the organizing team" : "Contact details to be announced"}
    </PrimaryButton>
  </div>
);

export function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq">
      {items.map((item, i) => (
        <div key={item.q} className={`qa ${open === i ? "open" : ""}`}>
          <h3>
            <button
              id={`q${i}`}
              aria-expanded={open === i}
              aria-controls={`a${i}`}
              onClick={() => setOpen(open === i ? null : i)}
            >
              {item.q}
              <ChevronDown size={20} />
            </button>
          </h3>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div
                id={`a${i}`}
                role="region"
                aria-labelledby={`q${i}`}
                className="ans"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <p>{item.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export const RegistrationCTA = ({ hasBg = false }: { hasBg?: boolean }) => (
  <section className={`rcta${hasBg ? " rcta--has-bg" : ""}`}>
    <div className="grain" aria-hidden="true" />
    <ScrollReveal className="wrap rcta-in">
      <p className="kicker">Registration</p>
      <h2>
        <TitleArt text="Register for the challenge." />
      </h2>
      <p>
        Registration opens {EVENT.registrationOpens} and closes {EVENT.registrationDeadline}. The
        official registration link will be shared once confirmed.
      </p>
      {EVENT.registrationUrl ? (
        <PrimaryButton href={EVENT.registrationUrl}>Register on the official portal</PrimaryButton>
      ) : (
        <PrimaryButton to="/register">View registration details</PrimaryButton>
      )}
    </ScrollReveal>
  </section>
);
