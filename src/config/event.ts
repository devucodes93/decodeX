// Central event configuration. Edit this file first.
//
// Values left as empty strings ("") are treated as not announced yet. The UI
// shows "To be announced" where the information is essential, and hides
// optional sections when there is nothing verified to display.
//
// Do not invent dates, prizes, sponsors, winners or statistics. Replace the
// values below with confirmed information from the organizing committee.

export const SHOW_RESULTS = false; // set to true ONLY when verified results are published

export const EVENT = {
  // Identity
  name: "DECODEX",
  edition: "2026",
  tagline: "Tagline",
  description:
    "National-level Signal Processing Based CTF Challenge organised by IEEE Signal Processing Society, BMS Institute of Technology and Management student branch chapter.",
  college: "BMS Institute of Technology and Management",
  department: "",
  organizer: "IEEE Signal Processing Society (SPS)",
  facultyCoordinator: "Dr. Pallavi Singh",
  studentCoordinators: "Kirthana JL",

  // When and where
  date: "2026-11-22T10:00:00+05:30",
  dateLabel:
    "• 22 November 2026 | 10:00 AM – 12:00 PM (Online Qualifier)\n• 27–28 November 2026 (24-hour Offline Challenge)",
  registrationOpens: "03 November 2026",
  registrationDeadline: "20 November 2026",
  venue: "BMS Institute of Technology and Management, Bengaluru",
  mode: "Online qualifier followed by an offline challenge",
  duration: "24-hour offline challenge",
  qualifierDate: "22 November 2026",
  qualifierTime: "10:00 AM – 12:00 PM",
  offlineDate: "27–28 November 2026",

  // Participation
  teamSize: "2–4 members",
  eligibility: "Students pursuing bachelor's degrees",
  fee: "",

  // Prizes
  prizePool: "₹50,000",
  prizes: {
    first: "", // e.g. "₹25,000"
    second: "", // e.g. "₹15,000"
    third: "", // e.g. "₹10,000"
    special: [] as string[], // e.g. ["Best beginner team", "Best social impact project"]
  },

  // Registration and contact
  registrationUrl: "", // Replace with the confirmed Unstop URL. Keep empty until then.
  contact: {
    person: "Mohith K Aralikatte",
    email: "", // Replace with confirmed contact email address(es).
    phone: "",
  },
  social: {
    // Replace these empty values only when the organizers confirm the URLs.
    instagram: "",
    linkedin: "",
    x: "",
    github: "",
  } as Record<string, string>,
  privacyUrl: "",
  conductUrl: "",
  announcement: "", // optional top banner. Empty = no banner

  // Results page (keep SHOW_RESULTS false until results are verified)
  resultsHeading: "Results",
  resultsBody:
    "The organizers have not published the results yet. Verified results will be posted on this page when they are available.",
};

/** Returns the value, or a clear "to be announced" label when it is empty. */
export const TBA = (value: string, what: string) =>
  value && value.trim() ? value : `${what} to be announced`;

/** True when a configuration value has been filled in. */
export const isSet = (value?: string) => Boolean(value && value.trim());

/** The label used for any required value that is not confirmed yet. */
export const ANNOUNCING = "To be announced";
