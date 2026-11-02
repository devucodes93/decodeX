import type { PreviousEditionHighlight, PreviousEditionStat } from "../types";

// Previous edition information is shown only when `verified` is true AND there
// is at least one verified highlight or statistic. Do not add unverified
// attendance figures, winners or sponsor claims here.
export const PREVIOUS_EDITION: {
  verified: boolean;
  label: string;
  summary: string;
  highlights: PreviousEditionHighlight[];
  stats: PreviousEditionStat[];
} = {
  verified: false,
  label: "", // e.g. "2025 Edition"
  summary: "", // a short, verified summary of the previous edition
  highlights: [], // e.g. { title: "42 teams", detail: "..." }
  stats: [], // e.g. { value: "42", label: "Teams" }
};
