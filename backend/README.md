# DECODEX CTF backend (Supabase)

The backend for the hidden CTF portal (`/ctf`, `/ctf-admin`). It runs entirely
on Supabase: Postgres tables, row-level security, and SQL functions. The site
stays a static Vite app; there is no separate server to host.

It is based on the sparc CTF, which also used Supabase (`questions`,
`progress`, `settings`), with the game logic moved out of the browser:

| sparc | DECODEX |
|---|---|
| Browser fetched `correct_answer` and compared it | Flags never leave the database; `ctf_submit_flag()` checks them |
| Next question chosen in the browser | Missions unlock in order, enforced by the server |
| Single device via a Realtime broadcast | Signing in ends the team's other session in the database |
| Leaderboard shown to players | Leaderboard only via `ctf_admin_leaderboard()` (admins) |
| Admin password hard-coded in the page | Admins are Supabase Auth users listed in `ctf_admins` |

## Files

```
backend/
  supabase/
    migrations/20261117000000_ctf.sql            tables, security rules, functions, realtime
    migrations/20261117010000_ctf_hardening.sql  hashed flags, rate limits, activity log
    migrations/20261117020000_ctf_audit_retention.sql  keeps the activity log small
    migrations/20261118000000_ctf_email_login.sql      teams sign in with the team lead's email
    migrations/20261119000000_ctf_rank_by_event_time.sql  ties ranked by real time from event start
    migrations/20261120000000_ctf_races_and_privacy.sql   login/team-save races, locked missions hide points
    migrations/20261121000000_ctf_no_practice.sql         no flags after the event is closed
    make-admin.sql                               give an Auth user control-room access
```

The frontend talks to it only through [`src/ctf/api.ts`](../src/ctf/api.ts).

## Setup

1. **Create a Supabase project** (or reuse one).
2. **Run all the migrations, in order** (oldest file name first).
   Supabase dashboard → SQL Editor → paste each file in
   `supabase/migrations/` → Run.
   With the Supabase CLI instead: `supabase link` then `supabase db push`
   from this `backend/` folder.
3. **Turn off public sign-ups.** Authentication → Sign In / Providers → Email
   → disable "Allow new users to sign up". Organisers are added by hand.
4. **Create an organiser login.** Authentication → Users → Add user (email +
   password, auto-confirm). Then edit the email in `supabase/make-admin.sql`
   and run it.
5. **Add the keys to the site.** Copy `.env.example` (project root) to `.env`
   and fill in Project Settings → API → Project URL and the `anon` public key.
   On Vercel, add the same two variables under Project → Settings →
   Environment Variables. Restart `npm run dev` after changing `.env`.
6. **Sign in at `/ctf-admin`**, set the start time under Event control, add
   missions, and add teams. Each new team's ID and password are shown once;
   send them to the team. Lost passwords are replaced with "New password".
   Flags are saved as one-way hashes and can never be viewed again, so keep
   your own answer key.

Only the `anon` key goes in the frontend. Never put the `service_role` key in
`.env` for this site.

## How it works

- **Teams** sign in with the team lead's email + password (`ctf_team_login`;
  a team ID also works). Each team's email must be unique. Passwords are
  stored as bcrypt hashes. The login returns a session token kept in the
  browser; every player call passes it. Signing in on a second device ends
  the first session.
- **Players never read tables.** They call `ctf_get_event`, `ctf_player_state`,
  `ctf_start`, `ctf_submit_flag` and `ctf_get_hints`. Locked missions' names,
  briefs, flags and hints are never returned.
- **Admins** sign in with Supabase Auth. Row-level security lets only users in
  `ctf_admins` read or change tables. Password hashes are not readable even
  by admins.
- **Closing the event.** Once an admin closes the event, every flag is
  refused (`EVENT_CLOSED`) and players see their final results. Reopening
  lets them carry on.
- **Live updates.** Admin screens get database changes through Supabase
  Realtime. Player screens only get "something changed" pings for organiser
  actions (hints, event open/close, mission and team changes) on the
  `ctf-live` broadcast channel, plus a refresh every 60 seconds as a backup.
  Other teams' captures and logins are never broadcast, so 120 screens don't
  reload every time anyone scores (fits Supabase's free plan comfortably).

## Tables

| Table | Holds |
|---|---|
| `ctf_settings` | Single row: start time, closed flag, closing message |
| `ctf_missions` | Title, category, points, brief, file links, flag, position |
| `ctf_teams` | Team details and password hash (no payment data) |
| `ctf_sessions` | Active player session per team |
| `ctf_progress` | When each team started |
| `ctf_solves` | Captured flags |
| `ctf_hints` | Hints to everyone, to a mission, or to one team |
| `ctf_admins` | Auth users allowed into the control room |

## Security

| Threat | Protection |
|---|---|
| Reading answers (page source, console, network tab) | Flags are stored as salted hashes (sha256 + bcrypt). No function returns them, to players or admins. The site's JavaScript contains no flags. |
| Scores jumping up or down (sparc's problem) | Browsers never write scores. A score is the sum of points fixed at solve time, one row per team per mission. Each team's submissions are processed one at a time, so double clicks, two tabs or scripts can't double-count. Editing a mission's points later doesn't change points already earned. |
| Skipping missions | Only the team's current mission can be answered, checked on the server. |
| Guessing flags by script | 10 submissions per team per minute, then refused (and logged). |
| Guessing passwords | 8 wrong passwords for a team ID from one IP address locks that pair for 15 minutes. Someone else can't lock a real team out from their own network. |
| Sharing a login | One active session per team; sessions expire after 12 hours. |
| SQL injection | No dynamic SQL. Every value reaches Postgres as a typed function parameter (Supabase / PostgREST). Tested with injection payloads in every input. |
| Tampering through the API | Players can't read or write any table. Admins can only read what the control room lists; every change goes through a checked, logged function. |
| Script in mission text or links | React renders text, never HTML. File links must be http(s). |
| Clickjacking | `/ctf*` pages refuse to load inside frames (vercel.json). |
| "Someone did something" | Every login, failed login, flag submission and admin change is in the Activity tab with time, team and IP. The log can't be edited or deleted. Submitted flag text is never stored. |
| Log filling the database | Repeated "locked" / "rate limited" events are logged at most once a minute; one IP gets at most 30 failed logins per 15 minutes. Routine entries are deleted after 30 days, captures and admin changes after a year, and routine entries are capped at 200,000 rows (~50 MB worst case). Pruning runs automatically every 500 entries. |

