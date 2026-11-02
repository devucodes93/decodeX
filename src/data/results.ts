import type { ResultEntry } from "../types";

// Intentionally EMPTY. Add entries only when 2026 results are verified, then set
// SHOW_RESULTS = true in src/config/event.ts. This file is loaded lazily and only
// when publication is enabled. Do not bundle confidential shortlist data.
export const RESULTS: ResultEntry[] = [];
