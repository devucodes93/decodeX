import type { CSSProperties } from "react";
import type { Milestone } from "../types";

type JourneyStatus = "done" | "live" | "upcoming" | "pending";

const STATUS_LABELS: Record<JourneyStatus, string> = {
  done: "Done",
  live: "Live",
  upcoming: "Soon",
  pending: "TBA",
};

const WARM_DESTINATIONS = new Set([4, 6, 8]);

export default function JourneyEventCard({
  event,
  index,
  total,
}: {
  event: Milestone;
  index: number;
  total: number;
}) {
  const status: JourneyStatus = event.status ?? "pending";
  const number = String(index + 1).padStart(2, "0");
  const accent = WARM_DESTINATIONS.has(index) ? "#FF8B45" : "#C5FF4A";

  return (
    <article
      className={`journey-card journey-card--${index % 3} journey-card--status-${status}`}
      style={{ "--card-accent": accent } as CSSProperties}
      data-number={number}
      aria-label={`Destination ${index + 1} of ${total}: ${event.title}`}
    >
      <div className="journey-card-top">
        <span className="journey-card-kicker">
          <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
          Destination {number}
        </span>
        <span className="journey-card-status">{STATUS_LABELS[status]}</span>
      </div>

      <h3>{event.title}</h3>
      <p>{event.description}</p>
    </article>
  );
}
