import type { Milestone } from "../types";
import { EVENT } from "../config/event";

export const TIMELINE: Milestone[] = [
  {
    title: "Registration Opens",
    description: `${EVENT.registrationOpens} — Registration Opens.`,
    date: "2026-11-03",
  },
  {
    title: "Registration Closes",
    description: `${EVENT.registrationDeadline} — Registration Closes.`,
    date: "2026-11-20",
  },
  {
    title: "Online CTF Qualifier",
    description: `${EVENT.qualifierDate} | ${EVENT.qualifierTime} — Online CTF Qualifier.`,
    date: "2026-11-22",
    time: EVENT.qualifierTime,
  },
  {
    title: "Top 30 Teams",
    description: "Teams qualifying from the online round advance to the offline challenge.",
  },
  {
    title: "24-Hour Offline Challenge",
    description: `${EVENT.offlineDate} — 24-Hour Offline Challenge at ${EVENT.venue.replace(", Bengaluru", "")}.`,
    date: "2026-11-27",
  },
];

export const SCHEDULE_PENDING = false;
