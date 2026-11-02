export interface Milestone {
  title: string;
  description: string;
  date?: string;
  time?: string;
  status?: "done" | "live" | "upcoming";
}

export interface Partner {
  name: string;
  logo?: string;
  url?: string;
}

export interface Tier {
  name: string;
  partners: Partner[];
}

export interface FAQItem {
  q: string;
  a: string;
}

export interface ResultEntry {
  rank?: number;
  team: string;
  college?: string;
  project?: string;
}

export interface Prize {
  label: string;
  amount: string;
  note?: string;
  highlight?: boolean;
}

export interface PreviousEditionHighlight {
  title: string;
  detail: string;
}

export interface PreviousEditionStat {
  value: string;
  label: string;
}
