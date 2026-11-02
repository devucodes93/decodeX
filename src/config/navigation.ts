import { SHOW_RESULTS } from "./event";

const ALL = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/results", label: "Results", needsResults: true },
  { to: "/timeline", label: "Timeline" },
  { to: "/collaboration", label: "Collaboration" },
  { to: "/faq", label: "FAQ" },
];

export const NAV = ALL.filter((item) => !item.needsResults || SHOW_RESULTS);
