// CTF data layer: every page talks to the backend only through this file.
//
// Backend: Supabase (see backend/README.md). Players call SQL functions with
// a team session token; admins are Supabase Auth users and call the
// ctf_admin_* functions. Every change goes through a server function that
// validates it and records it in the activity log.
//
// Flags are write-only: they are stored as hashes, checked on the server, and
// never returned to any browser (players or admins).

import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { defaultLinkLabel } from "./links";

/* ------------------------------------------------------------------ types */

export type EventState = {
  /** ISO time the missions unlock. */
  startsAt: string;
  /** Set by an admin to end the event. No more flags are accepted. */
  closed: boolean;
  closedMessage: string;
};

export type TeamSession = { teamId: string; teamName: string };
export type AdminSession = { email: string };

export type Attachment = { label: string; size?: string; url?: string };

/** A mission as players see it (no flag). `order` is its 1-based position. */
export type Mission = {
  id: string;
  order: number;
  title: string;
  category: string;
  points: number;
  prompt: string;
  attachments: Attachment[];
};

export type MissionSlot = {
  /** Null for locked missions. */
  id: string | null;
  order: number;
  /** Null for locked missions. */
  points: number | null;
  status: "solved" | "current" | "locked";
  /** Null for locked missions so their names don't leak. */
  title?: string | null;
  category?: string | null;
};

export type PlayerState = {
  slots: MissionSlot[];
  /** The mission to work on now; null before the start or when all are done. */
  current: Mission | null;
  solved: number;
  total: number;
  score: number;
  startedAt: number | null;
  finishedAt: number | null;
  /** Every mission captured. */
  finished: boolean;
};

/** Seconds a team waits after a wrong flag (the server enforces it). */
export const FLAG_COOLDOWN_S = 15;

export type SubmitResult =
  /** Wrong flag, or (`cooldown`) refused unchecked because the team is still cooling down. */
  | { correct: false; retryIn: number; cooldown?: boolean }
  | { correct: true; points: number; finished: boolean };

export type LeaderboardRow = {
  teamId: string;
  teamName: string;
  institution: string;
  /** Points from flags minus any penalty. */
  score: number;
  /** Penalty points subtracted (0 = none). Missing before the 20261127 migration. */
  penalty?: number;
  penaltyNote?: string;
  solved: number;
  total: number;
  /** From the event start (set by organisers) to the team's last scoring flag. */
  timeTakenMs: number | null;
  lastSolveAt: number | null;
  finished: boolean;
};

/** A mission as admins see it. The flag is never sent back, even to admins. */
export type MissionStat = Mission & {
  solves: number;
  /**
   * False for missions whose flag was saved before flags became
   * case-sensitive (still matched ignoring capitals until re-entered).
   * Missing if the 20261124 migration hasn't been run.
   */
  caseSensitive?: boolean;
};

/** What an admin fills in to create or edit a mission. */
export type MissionInput = Omit<Mission, "id" | "order"> & {
  id?: string;
  /** Required for a new mission. On edit, leave empty to keep the current flag. */
  flag: string;
};

/** One entry in the control room's activity log. */
export type ActivityEntry = {
  id: number;
  at: number;
  kind: "login" | "login_failed" | "login_locked" | "flag_correct" | "flag_wrong" | "flag_practice" | "rate_limited" | "admin";
  teamId: string | null;
  teamName: string | null;
  missionTitle: string | null;
  ip: string;
  detail: string;
};

/** A registered team. Passwords are only stored as hashes on the server. */
export type TeamRecord = {
  id: string;
  name: string;
  institution: string;
  leader: string;
  email: string;
  phone: string;
  members: string[];
  ieeeId: string;
  createdAt: number;
};

/** What an admin fills in to create or edit a team. */
export type TeamInput = Omit<TeamRecord, "id" | "createdAt"> & {
  id?: string;
  /** Required for a new team. On edit, set only to change it. */
  password?: string;
};

/** A saved team; `password` is present only when it was just set. */
export type SavedTeam = TeamRecord & { password?: string };

export type HintTarget =
  | { kind: "all" }
  | { kind: "mission"; missionId: string }
  | { kind: "team"; teamId: string };

export type Hint = { id: string; message: string; target: HintTarget; createdAt: number };

/** A hint as a player receives it. */
export type PlayerHint = Hint & { missionOrder?: number | null; missionTitle?: string | null };

/* --------------------------------------------------------------- client */

const URL_ = import.meta.env.VITE_SUPABASE_URL?.trim();
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** False until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set. */
export const isBackendConfigured = Boolean(URL_ && KEY);

let client: SupabaseClient | null = null;

function db(): SupabaseClient {
  if (!isBackendConfigured) {
    throw new Error("The CTF backend isn't connected yet. Add the Supabase keys to .env (see backend/README.md).");
  }
  if (!client) {
    client = createClient(URL_!, KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "decodex-ctf-admin-auth" },
    });
  }
  return client;
}

const TEAM_SESSION_KEY = "decodex-ctf-team";
export const SESSION_EXPIRED_EVENT = "decodex-ctf-session-expired";

type StoredTeamSession = TeamSession & { token: string };

function readTeamSession(): StoredTeamSession | null {
  try {
    const raw = localStorage.getItem(TEAM_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredTeamSession) : null;
  } catch {
    return null;
  }
}

function writeTeamSession(s: StoredTeamSession | null) {
  try {
    if (s) localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(TEAM_SESSION_KEY);
  } catch {
    /* storage blocked: session lasts for this page only */
  }
}

/** Server error codes raised by the SQL functions, in plain words. */
const ERRORS: Record<string, string> = {
  INVALID_LOGIN: "That email and password don't match any registered team.",
  EMAIL_REQUIRED: "Enter a valid team lead email. Teams sign in with it.",
  EMAIL_TAKEN: "Another team already uses that email.",
  SESSION_EXPIRED: "Your team signed in on another device, so this session ended.",
  NOT_STARTED: "The event has not started yet.",
  EVENT_CLOSED: "The event has ended. Flags are no longer accepted.",
  NOT_CURRENT: "The missions were updated by the organisers. Reloading…",
  FORBIDDEN: "This account doesn't have control-room access.",
  TOO_MANY_LOGINS: "Too many wrong passwords. Wait 15 minutes, or ask the organisers for help.",
  RATE_LIMITED: "Too many attempts. Wait a minute before trying again.",
  FLAG_REQUIRED: "Every new mission needs a flag.",
  FLAG_TOO_LONG: "That flag is too long (500 characters max).",
  BAD_URL: "File links must start with http:// or https://.",
  BAD_POINTS: "Points must be between 0 and 100,000.",
  TITLE_REQUIRED: "Give the mission a title.",
  MISSION_NOT_FOUND: "That mission no longer exists.",
  TEAM_NAME_REQUIRED: "Enter the team name.",
  TEAM_NAME_TAKEN: "Another team already uses that name.",
  TEAM_NOT_FOUND: "That team no longer exists.",
  PASSWORD_TOO_SHORT: "Passwords need at least 6 characters.",
};

function fail(error: { message?: string; code?: string } | null): never {
  const raw = error?.message ?? "";
  const code = Object.keys(ERRORS).find((k) => raw.includes(k));
  if (code === "SESSION_EXPIRED") {
    writeTeamSession(null);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (code) throw new Error(ERRORS[code]);
  if (error?.code === "23505") throw new Error("That already exists.");
  throw new Error(raw || "Couldn't reach the server. Check your connection and try again.");
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) fail(error);
  // Refusals that the server logs come back as {"error": "CODE"}.
  if (data && typeof data === "object" && !Array.isArray(data) && typeof (data as { error?: unknown }).error === "string") {
    fail({ message: (data as { error: string }).error });
  }
  return data as T;
}

function token(): string {
  const s = readTeamSession();
  if (!s) fail({ message: "SESSION_EXPIRED" });
  return s.token;
}

/**
 * Server clock minus this device's clock (ms), measured on every
 * ctf_get_event. Pages time the event by the server, so a device set to the
 * wrong date shows the right countdown. (The server enforces the start time
 * either way: nothing is sent before it.)
 */
let clockOffset = 0;
export const serverNow = () => Date.now() + clockOffset;

export const isLive = (e: EventState, now = serverNow()) => !e.closed && new Date(e.startsAt).getTime() <= now;

/* ------------------------------------------------------------ live updates */

const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let pending: number | null = null;
let lastRun = 0;
/** At most one refetch per second, however many pings arrive (spam-safe). */
const MIN_GAP_MS = 1000;

function emit() {
  if (pending !== null) return;
  const wait = Math.max(120, MIN_GAP_MS - (Date.now() - lastRun));
  pending = window.setTimeout(() => {
    pending = null;
    lastRun = Date.now();
    listeners.forEach((l) => l());
  }, wait);
}

/**
 * True on the control room. Only admin screens subscribe to database row
 * changes: player screens never could read those rows, and subscribing ~120
 * of them would make Supabase run a permission check per player per change.
 */
let adminMode = false;

function ensureChannel() {
  if (channel || !isBackendConfigured) return;
  channel = db().channel("ctf-live", { config: { broadcast: { self: false } } });
  // Organiser actions (hints, event, missions, teams) ping everyone.
  channel.on("broadcast", { event: "changed" }, emit);
  if (adminMode) {
    for (const table of ["ctf_progress", "ctf_solves", "ctf_hints", "ctf_audit"]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, emit);
    }
  }
  channel.subscribe();
}

function resetChannel() {
  void channel?.unsubscribe();
  channel = null;
  if (listeners.size) ensureChannel();
}

function setAdminMode(on: boolean) {
  if (adminMode === on) return;
  adminMode = on;
  resetChannel();
}

/**
 * Tells every open screen to refetch (no data is sent). Used only for
 * organiser actions; players' own logins and captures are not broadcast,
 * so 120 screens don't reload every time any team scores.
 */
function ping(scope: string) {
  emit();
  if (!isBackendConfigured) return;
  ensureChannel();
  void channel?.send({ type: "broadcast", event: "changed", payload: { scope } });
}

/** Backup refresh for player screens in case the live connection drops. */
const PLAYER_BACKUP_MS = 60_000;
let backupTimer: number | null = null;

/** Calls `onChange` whenever CTF data may have changed. */
export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  ensureChannel();
  if (backupTimer === null) {
    backupTimer = window.setInterval(() => {
      // The control room has its own faster poll.
      if (!adminMode && document.visibilityState === "visible") emit();
    }, PLAYER_BACKUP_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (!listeners.size && backupTimer !== null) {
      window.clearInterval(backupTimer);
      backupTimer = null;
    }
  };
}

/* --------------------------------------------------------------- players */

export function getSession(): TeamSession | null {
  const s = readTeamSession();
  return s ? { teamId: s.teamId, teamName: s.teamName } : null;
}

/** Sign in with the team lead's email (a team ID also works). */
export async function login(email: string, password: string): Promise<TeamSession> {
  const res = await rpc<StoredTeamSession>("ctf_team_login", { p_team_id: email.trim(), p_password: password });
  writeTeamSession(res);
  // Not broadcast: the team's other device finds out its session ended on
  // its next request (any action, or the 60-second backup refresh).
  return { teamId: res.teamId, teamName: res.teamName };
}

export async function logout(): Promise<void> {
  const s = readTeamSession();
  writeTeamSession(null);
  if (s && isBackendConfigured) await db().rpc("ctf_team_logout", { p_token: s.token });
}

export async function getEvent(): Promise<EventState> {
  const sent = Date.now();
  const { serverNow: at, ...event } = await rpc<EventState & { serverNow?: string }>("ctf_get_event");
  const server = at ? new Date(at).getTime() : NaN;
  // Assume the server read its clock halfway through the round trip.
  if (Number.isFinite(server)) clockOffset = server - (sent + Date.now()) / 2;
  return event;
}

/** Starts the team's clock the first time it opens a mission while live. */
export async function startMissions(): Promise<void> {
  await rpc("ctf_start", { p_token: token() });
}

export async function getPlayerState(): Promise<PlayerState> {
  return rpc<PlayerState>("ctf_player_state", { p_token: token() });
}

export async function submitFlag(missionId: string, flag: string): Promise<SubmitResult> {
  const { data, error } = await db().rpc("ctf_submit_flag", { p_token: token(), p_mission_id: missionId, p_flag: flag });
  if (error) fail(error);
  const d = (data ?? {}) as { error?: unknown; retryIn?: unknown };
  if (d.error === "COOLDOWN") return { correct: false, cooldown: true, retryIn: Number(d.retryIn) || FLAG_COOLDOWN_S };
  if (typeof d.error === "string") fail({ message: d.error });
  const res = data as SubmitResult;
  if (!res.correct && !res.retryIn) res.retryIn = FLAG_COOLDOWN_S;
  // Refresh this screen only. Other teams aren't told; the control room
  // sees the capture through its own live database feed.
  if (res.correct) emit();
  return res;
}

/** Hints this team can see (never hints for missions it hasn't reached). */
export async function getHints(): Promise<PlayerHint[]> {
  return rpc<PlayerHint[]>("ctf_get_hints", { p_token: token() });
}

/* ----------------------------------------------------------------- admin */

/** The signed-in organiser, or null. Checks control-room access on the server. */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isBackendConfigured) return null;
  const { data } = await db().auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const { data: ok, error } = await db().rpc("ctf_is_admin");
  if (error || !ok) return null;
  setAdminMode(true);
  return { email: user.email ?? "" };
}

export async function adminLogin(email: string, password: string): Promise<AdminSession> {
  const { data, error } = await db().auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.user) throw new Error("Wrong email or password.");
  const { data: ok } = await db().rpc("ctf_is_admin");
  if (!ok) {
    await db().auth.signOut();
    throw new Error(ERRORS.FORBIDDEN);
  }
  // Reconnect realtime with the admin's token so row changes come through.
  adminMode = true;
  resetChannel();
  return { email: data.user.email ?? "" };
}

export async function adminLogout(): Promise<void> {
  if (isBackendConfigured) await db().auth.signOut();
  setAdminMode(false);
}

/** Standings: points high to low; equal points go to whoever scored their last flag first (real time). Admin only. */
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  return rpc<LeaderboardRow[]>("ctf_admin_leaderboard");
}

/* -------- event */

export async function updateEvent(patch: Partial<EventState>): Promise<void> {
  await rpc("ctf_admin_update_event", {
    p_starts_at: patch.startsAt ?? null,
    p_closed: patch.closed ?? null,
    p_closed_message: patch.closedMessage ?? null,
  });
  ping("event");
}

/* -------- website maintenance */

/** Whether the public website shows the maintenance page. */
export async function getSiteStatus(): Promise<{ maintenance: boolean }> {
  const res = await rpc<{ maintenance?: boolean }>("ctf_site_status");
  return { maintenance: Boolean(res?.maintenance) };
}

/** Turns the public website's maintenance page on or off. Admin only. */
export async function setMaintenance(on: boolean): Promise<void> {
  await rpc("ctf_admin_set_maintenance", { p_on: on });
  ping("event");
}

/* -------- missions */

export async function getMissionStats(): Promise<MissionStat[]> {
  return rpc<MissionStat[]>("ctf_admin_missions");
}

/** The flag is sent once, hashed on the server, and never returned. */
export async function saveMission(input: MissionInput): Promise<{ id: string; title: string }> {
  const title = input.title.trim();
  const flag = input.flag.trim();
  if (!title) throw new Error(ERRORS.TITLE_REQUIRED);
  if (!input.id && !flag) throw new Error(ERRORS.FLAG_REQUIRED);
  if (!Number.isFinite(input.points) || input.points < 0) throw new Error(ERRORS.BAD_POINTS);
  const attachments = input.attachments
    .map((a) => {
      const url = a.url?.trim() || undefined;
      const label = a.label.trim() || (url ? defaultLinkLabel(url) : "");
      return { label, size: a.size?.trim() || undefined, url };
    })
    .filter((a) => a.label);
  if (attachments.some((a) => a.url && !/^https?:\/\/\S+$/i.test(a.url))) throw new Error(ERRORS.BAD_URL);

  const saved = await rpc<{ id: string; title: string }>("ctf_admin_save_mission", {
    p_id: input.id ?? null,
    p_title: title,
    p_category: input.category.trim(),
    p_points: Math.round(input.points),
    p_prompt: input.prompt.trim(),
    p_attachments: attachments,
    p_flag: flag,
  });
  ping("missions");
  return saved;
}

export async function deleteMission(id: string): Promise<void> {
  await rpc("ctf_admin_delete_mission", { p_id: id });
  ping("missions");
}

/** Saves a new mission order. `ids` is the full list in the new order. */
export async function reorderMissions(ids: string[]): Promise<void> {
  await rpc("ctf_admin_reorder_missions", { p_ids: ids });
  ping("missions");
}

/* -------- teams */

type TeamRow = {
  id: string;
  name: string;
  institution: string;
  leader: string;
  email: string;
  phone: string;
  members: string[];
  ieee_id: string;
  created_at: string;
};

export async function getTeams(): Promise<TeamRecord[]> {
  const { data, error } = await db()
    .from("ctf_teams")
    .select("id, name, institution, leader, email, phone, members, ieee_id, created_at")
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return (data as TeamRow[]).map((t) => ({
    id: t.id,
    name: t.name,
    institution: t.institution,
    leader: t.leader,
    email: t.email,
    phone: t.phone,
    members: t.members ?? [],
    ieeeId: t.ieee_id,
    createdAt: Date.parse(t.created_at),
  }));
}

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
/** Random 10-character password without look-alike characters. */
export function generatePassword() {
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

export async function saveTeam(input: TeamInput): Promise<SavedTeam> {
  if (!input.name.trim()) throw new Error(ERRORS.TEAM_NAME_REQUIRED);
  if (!input.email.trim()) throw new Error("Enter a contact email.");
  const password = input.password?.trim() ?? "";
  if (!input.id && password.length < 6) throw new Error(ERRORS.PASSWORD_TOO_SHORT);

  const team = await rpc<TeamRecord>("ctf_admin_save_team", {
    p_id: input.id ?? null,
    p_name: input.name,
    p_institution: input.institution,
    p_leader: input.leader,
    p_email: input.email,
    p_phone: input.phone,
    p_members: input.members.map((m) => m.trim()).filter(Boolean),
    p_ieee_id: input.ieeeId,
    p_password: password,
  });
  ping("teams");
  return password ? { ...team, password } : team;
}

export async function deleteTeam(id: string): Promise<void> {
  await rpc("ctf_admin_delete_team", { p_team_id: id });
  ping("teams");
}

/** Clears a team's flags and clock so it can start again. */
export async function resetTeamProgress(id: string): Promise<void> {
  await rpc("ctf_admin_reset_team", { p_team_id: id });
  ping("teams");
}

/* -------- hints */

type HintRow = { id: string; message: string; target_kind: HintTarget["kind"]; mission_id: string | null; team_id: string | null; created_at: string };

export async function getAllHints(): Promise<Hint[]> {
  const { data, error } = await db()
    .from("ctf_hints")
    .select("id, message, target_kind, mission_id, team_id, created_at")
    .order("created_at", { ascending: false });
  if (error) fail(error);
  return (data as HintRow[]).map((h) => ({
    id: h.id,
    message: h.message,
    createdAt: Date.parse(h.created_at),
    target:
      h.target_kind === "mission"
        ? { kind: "mission", missionId: h.mission_id! }
        : h.target_kind === "team"
          ? { kind: "team", teamId: h.team_id! }
          : { kind: "all" },
  }));
}

export async function sendHint(message: string, target: HintTarget): Promise<void> {
  const text = message.trim();
  if (!text) throw new Error("Write the hint first.");
  const { error } = await db()
    .from("ctf_hints")
    .insert({
      message: text,
      target_kind: target.kind,
      mission_id: target.kind === "mission" ? target.missionId : null,
      team_id: target.kind === "team" ? target.teamId : null,
    });
  if (error) fail(error);
  ping("hints");
}

export async function deleteHint(id: string): Promise<void> {
  const { error } = await db().from("ctf_hints").delete().eq("id", id);
  if (error) fail(error);
  ping("hints");
}

/* -------- activity log */

/** Latest logins, submissions and admin changes, newest first. */
export async function getActivity(limit = 300): Promise<ActivityEntry[]> {
  return rpc<ActivityEntry[]>("ctf_admin_activity", { p_limit: limit });
}
