import type { Milestone } from "../types";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

function formatDate(value?: string) {
  if (!value) return "Qualification";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || !MONTHS[month - 1]) return value;
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
}

export default function JourneyEventCard({
  event,
  index,
}: {
  event: Milestone;
  index: number;
}) {
  const date = formatDate(event.date);

  return (
    <article className="journey-card" aria-labelledby={`journey-card-${index}`}>
      <div className="journey-card-meta">
        <span className="journey-card-index">{date}</span>
      </div>
      <h3 id={`journey-card-${index}`}>{event.title}</h3>
      <p>{event.description}</p>
    </article>
  );
}
