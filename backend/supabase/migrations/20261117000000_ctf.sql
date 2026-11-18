-- DECODEX virtual CTF: database schema, security rules and server logic.
--
-- Based on the sparc CTF (Supabase tables: questions, progress, settings,
-- users), with the game logic moved from the browser into Postgres so that:
--   * flags never leave the database (sparc sent `correct_answer` to the browser),
--   * missions unlock strictly in order, checked on the server,
--   * a team can only be signed in on one device at a time,
--   * the leaderboard is visible to admins only.
--
-- Players (teams) sign in with a team ID + password checked by
-- ctf_team_login(); they get a session token and every player call goes
-- through a SECURITY DEFINER function that takes that token. Players never
-- read tables directly.
--
-- Admins are Supabase Auth users listed in ctf_admins. They read and write
-- tables directly (row-level security lets only admins through) and call the
-- ctf_admin_* functions.
--
-- Run this once in the Supabase SQL editor (or `supabase db push`).

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------------ tables

-- One row: when missions unlock and whether the event is closed (sparc's `settings`).
create table public.ctf_settings (
  id smallint primary key default 1 check (id = 1),
  starts_at timestamptz not null default '2026-11-22 10:00:00+05:30',
  closed boolean not null default false,
  closed_message text not null default 'Time is up. Thank you for playing. Results will be announced by the organisers.',
  updated_at timestamptz not null default now()
);
insert into public.ctf_settings (id) values (1) on conflict (id) do nothing;

-- Supabase Auth users who may use the control room.
create table public.ctf_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Missions in play order (sparc's `questions`).
create table public.ctf_missions (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  title text not null check (length(trim(title)) > 0),
  category text not null default 'General',
  points integer not null default 100 check (points >= 0),
  prompt text not null default '',
  -- [{ "label": "file.wav", "size": "2 MB", "url": "https://..." }]
  attachments jsonb not null default '[]'::jsonb,
  flag text not null check (length(trim(flag)) > 0),
  created_at timestamptz not null default now()
);
create index ctf_missions_position_idx on public.ctf_missions (position, created_at);

-- Teams and their login. Only a bcrypt hash of the password is stored.
create table public.ctf_teams (
  id text primary key,                     -- e.g. TEAM-001
  name text not null check (length(trim(name)) > 0),
  password_hash text not null,
  institution text not null default '',
  leader text not null default '',
  email text not null default '',
  phone text not null default '',
  members text[] not null default '{}',
  ieee_id text not null default '',
  created_at timestamptz not null default now()
);
create unique index ctf_teams_name_key on public.ctf_teams (lower(name));

-- Player sessions. One per team: signing in again ends the old one.
create table public.ctf_sessions (
  token uuid primary key default gen_random_uuid(),
  team_id text not null references public.ctf_teams (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index ctf_sessions_team_idx on public.ctf_sessions (team_id);

-- When each team opened its first mission (ties are broken by time).
create table public.ctf_progress (
  team_id text primary key references public.ctf_teams (id) on delete cascade,
  started_at timestamptz
);

-- Captured flags. `practice` = captured after the event was closed (not scored).
create table public.ctf_solves (
  team_id text not null references public.ctf_teams (id) on delete cascade,
  mission_id uuid not null references public.ctf_missions (id) on delete cascade,
  solved_at timestamptz not null default now(),
  practice boolean not null default false,
  primary key (team_id, mission_id)
);
create index ctf_solves_mission_idx on public.ctf_solves (mission_id);

-- Hints broadcast from the control room.
create table public.ctf_hints (
  id uuid primary key default gen_random_uuid(),
  message text not null check (length(trim(message)) between 1 and 500),
  target_kind text not null check (target_kind in ('all', 'mission', 'team')),
  mission_id uuid references public.ctf_missions (id) on delete cascade,
  team_id text references public.ctf_teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((target_kind = 'mission') = (mission_id is not null)),
  check ((target_kind = 'team') = (team_id is not null))
);

-- New missions go to the end unless a position is given.
create function public.ctf_missions_default_position()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.position is null then
    select coalesce(max(position), 0) + 1 into new.position from public.ctf_missions;
  end if;
  return new;
end;
$$;

create trigger ctf_missions_default_position
before insert on public.ctf_missions
for each row execute function public.ctf_missions_default_position();

create function public.ctf_settings_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ctf_settings_touch
before update on public.ctf_settings
for each row execute function public.ctf_settings_touch();

-- --------------------------------------------------------- row-level security

create function public.ctf_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.ctf_admins where user_id = auth.uid());
$$;

alter table public.ctf_settings enable row level security;
alter table public.ctf_admins   enable row level security;
alter table public.ctf_missions enable row level security;
alter table public.ctf_teams    enable row level security;
alter table public.ctf_sessions enable row level security;
alter table public.ctf_progress enable row level security;
alter table public.ctf_solves   enable row level security;
alter table public.ctf_hints    enable row level security;

create policy "admins read own row" on public.ctf_admins
  for select to authenticated using (user_id = auth.uid());

create policy "admins manage settings" on public.ctf_settings
  for all to authenticated using (public.ctf_is_admin()) with check (public.ctf_is_admin());
create policy "admins manage missions" on public.ctf_missions
  for all to authenticated using (public.ctf_is_admin()) with check (public.ctf_is_admin());
create policy "admins manage teams" on public.ctf_teams
  for all to authenticated using (public.ctf_is_admin()) with check (public.ctf_is_admin());
create policy "admins manage progress" on public.ctf_progress
  for all to authenticated using (public.ctf_is_admin()) with check (public.ctf_is_admin());
create policy "admins manage solves" on public.ctf_solves
  for all to authenticated using (public.ctf_is_admin()) with check (public.ctf_is_admin());
create policy "admins manage hints" on public.ctf_hints
  for all to authenticated using (public.ctf_is_admin()) with check (public.ctf_is_admin());
-- ctf_sessions: no policies. Only the functions below touch it.

-- Players never touch tables directly.
revoke all on public.ctf_settings, public.ctf_admins, public.ctf_missions, public.ctf_teams,
  public.ctf_sessions, public.ctf_progress, public.ctf_solves, public.ctf_hints from anon;

-- Admins may read team details but never password hashes; teams are
-- created and edited through ctf_admin_save_team().
revoke select, insert, update on public.ctf_teams from authenticated;
grant select (id, name, institution, leader, email, phone, members, ieee_id, created_at)
  on public.ctf_teams to authenticated;
revoke all on public.ctf_sessions from authenticated;

-- ------------------------------------------------------------------ helpers

create function public.ctf_ms(ts timestamptz)
returns bigint
language sql
immutable
as $$
  select case when ts is null then null else floor(extract(epoch from ts) * 1000)::bigint end;
$$;

-- Team for a session token, or an error the frontend turns into "signed out".
create function public.ctf_session_team(p_token uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team text;
begin
  select team_id into v_team from public.ctf_sessions where token = p_token;
  if v_team is null then
    raise exception 'SESSION_EXPIRED';
  end if;
  return v_team;
end;
$$;

-- Every mission in order with this team's status. Internal only.
create function public.ctf_team_missions(p_team text)
returns table (
  id uuid,
  ord integer,
  title text,
  category text,
  points integer,
  prompt text,
  attachments jsonb,
  solved boolean,
  practiced boolean,
  solved_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    (row_number() over (order by m.position, m.created_at))::integer,
    m.title,
    m.category,
    m.points,
    m.prompt,
    m.attachments,
    coalesce(x.practice = false, false),
    -- practice captures only count while the event is closed; after a
    -- reopen those missions can be scored for real
    coalesce(x.practice and st.closed, false),
    case when x.practice = false then x.solved_at end
  from public.ctf_missions m
  cross join (select closed from public.ctf_settings where id = 1) st
  left join public.ctf_solves x on x.mission_id = m.id and x.team_id = p_team
  order by m.position, m.created_at;
$$;

-- The team's next mission (first one not captured), or null.
create function public.ctf_current_mission(p_team text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id from public.ctf_team_missions(p_team) t
  where not t.solved and not t.practiced
  order by t.ord
  limit 1;
$$;

create function public.ctf_event_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select closed or starts_at <= now() from public.ctf_settings where id = 1;
$$;

revoke execute on function public.ctf_session_team(uuid) from public, anon, authenticated;
revoke execute on function public.ctf_team_missions(text) from public, anon, authenticated;
revoke execute on function public.ctf_current_mission(text) from public, anon, authenticated;

-- ------------------------------------------------------------- player API

create function public.ctf_get_event()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'startsAt', starts_at,
    'closed', closed,
    'closedMessage', closed_message
  )
  from public.ctf_settings where id = 1;
$$;

create function public.ctf_team_login(p_team_id text, p_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_team public.ctf_teams;
  v_token uuid;
begin
  select * into v_team from public.ctf_teams where upper(id) = upper(trim(p_team_id));
  if v_team.id is null or v_team.password_hash <> extensions.crypt(p_password, v_team.password_hash) then
    raise exception 'INVALID_LOGIN';
  end if;

  -- One device per team: signing in ends every other session.
  delete from public.ctf_sessions where team_id = v_team.id;
  insert into public.ctf_sessions (team_id) values (v_team.id) returning token into v_token;

  return jsonb_build_object('token', v_token, 'teamId', v_team.id, 'teamName', v_team.name);
end;
$$;

create function public.ctf_team_logout(p_token uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.ctf_sessions where token = p_token;
$$;

-- Starts the team's clock the first time it opens a mission while live.
create function public.ctf_start(p_token uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_team text := public.ctf_session_team(p_token);
begin
  if exists (select 1 from public.ctf_settings where id = 1 and not closed and starts_at <= now()) then
    insert into public.ctf_progress (team_id, started_at) values (v_team, now())
    on conflict (team_id) do update set started_at = coalesce(public.ctf_progress.started_at, excluded.started_at);
  end if;
end;
$$;

create function public.ctf_player_state(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team text := public.ctf_session_team(p_token);
  v_open boolean := public.ctf_event_open();
  v_current uuid := public.ctf_current_mission(v_team);
  v_started timestamptz;
  v_slots jsonb;
  v_mission jsonb;
  v_total integer;
  v_solved integer;
  v_done integer;
  v_score integer;
  v_last timestamptz;
begin
  select started_at into v_started from public.ctf_progress where team_id = v_team;

  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'order', t.ord,
      'points', t.points,
      'status', case
        when t.solved then 'solved'
        when t.practiced then 'practice'
        when v_open and t.id = v_current then 'current'
        else 'locked' end,
      -- names of locked missions never leave the server
      'title', case when t.solved or t.practiced or (v_open and t.id = v_current) then t.title end,
      'category', case when t.solved or t.practiced or (v_open and t.id = v_current) then t.category end
    ) order by t.ord), '[]'::jsonb),
    count(*),
    count(*) filter (where t.solved),
    count(*) filter (where t.solved or t.practiced),
    coalesce(sum(t.points) filter (where t.solved), 0),
    max(t.solved_at)
  into v_slots, v_total, v_solved, v_done, v_score, v_last
  from public.ctf_team_missions(v_team) t;

  if v_open and v_current is not null then
    select jsonb_build_object(
      'id', t.id, 'order', t.ord, 'title', t.title, 'category', t.category,
      'points', t.points, 'prompt', t.prompt, 'attachments', t.attachments
    ) into v_mission
    from public.ctf_team_missions(v_team) t where t.id = v_current;
  end if;

  return jsonb_build_object(
    'slots', v_slots,
    'current', v_mission,
    'solved', v_solved,
    'total', v_total,
    'score', v_score,
    'startedAt', public.ctf_ms(v_started),
    'finishedAt', case when v_total > 0 and v_solved = v_total then public.ctf_ms(v_last) end,
    'finished', v_total > 0 and v_done = v_total
  );
end;
$$;

create function public.ctf_submit_flag(p_token uuid, p_mission_id uuid, p_flag text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_team text := public.ctf_session_team(p_token);
  v_closed boolean;
  v_starts timestamptz;
  v_flag text;
  v_points integer;
  v_finished boolean;
begin
  select closed, starts_at into v_closed, v_starts from public.ctf_settings where id = 1;
  if not v_closed and v_starts > now() then
    raise exception 'NOT_STARTED';
  end if;

  -- Missions unlock in order: only the current one can be answered.
  if public.ctf_current_mission(v_team) is distinct from p_mission_id then
    raise exception 'NOT_CURRENT';
  end if;

  select flag, points into v_flag, v_points from public.ctf_missions where id = p_mission_id;
  if lower(trim(coalesce(p_flag, ''))) <> lower(trim(v_flag)) then
    return jsonb_build_object('correct', false);
  end if;

  if v_closed then
    insert into public.ctf_solves (team_id, mission_id, practice)
    values (v_team, p_mission_id, true)
    on conflict (team_id, mission_id) do nothing;
  else
    insert into public.ctf_progress (team_id, started_at) values (v_team, now())
    on conflict (team_id) do update set started_at = coalesce(public.ctf_progress.started_at, excluded.started_at);

    insert into public.ctf_solves (team_id, mission_id, practice)
    values (v_team, p_mission_id, false)
    on conflict (team_id, mission_id) do update
      set practice = false, solved_at = now()
      where public.ctf_solves.practice;
  end if;

  v_finished := public.ctf_current_mission(v_team) is null;

  return jsonb_build_object(
    'correct', true,
    'points', case when v_closed then 0 else v_points end,
    'practice', v_closed,
    'finished', v_finished
  );
end;
$$;

-- Hints this team may see: to everyone, to this team, or for a mission the
-- team has reached. Hints for locked missions stay hidden.
create function public.ctf_get_hints(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team text := public.ctf_session_team(p_token);
  v_open boolean := public.ctf_event_open();
  v_current uuid := public.ctf_current_mission(v_team);
  v_result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'message', h.message,
    'target', case h.target_kind
      when 'all' then jsonb_build_object('kind', 'all')
      when 'team' then jsonb_build_object('kind', 'team', 'teamId', h.team_id)
      else jsonb_build_object('kind', 'mission', 'missionId', h.mission_id) end,
    'createdAt', public.ctf_ms(h.created_at),
    'missionOrder', t.ord,
    'missionTitle', t.title
  ) order by h.created_at desc), '[]'::jsonb)
  into v_result
  from public.ctf_hints h
  left join public.ctf_team_missions(v_team) t on t.id = h.mission_id
  where h.target_kind = 'all'
     or (h.target_kind = 'team' and h.team_id = v_team)
     or (h.target_kind = 'mission' and (t.solved or t.practiced or (v_open and t.id = v_current)));

  return v_result;
end;
$$;

-- -------------------------------------------------------------- admin API

create function public.ctf_require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.ctf_is_admin() then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

-- Standings: points high to low, then fastest time. Admins only.
create function public.ctf_admin_leaderboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_result jsonb;
begin
  perform public.ctf_require_admin();
  select count(*) into v_total from public.ctf_missions;

  with r as (
    select
      t.id, t.name, t.institution, p.started_at,
      count(x.mission_id) filter (where not x.practice) as solved,
      coalesce(sum(m.points) filter (where not x.practice), 0) as score,
      max(x.solved_at) filter (where not x.practice) as last
    from public.ctf_teams t
    left join public.ctf_progress p on p.team_id = t.id
    left join public.ctf_solves x on x.team_id = t.id
    left join public.ctf_missions m on m.id = x.mission_id
    group by t.id, t.name, t.institution, p.started_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'teamId', r.id,
    'teamName', r.name,
    'institution', r.institution,
    'score', r.score,
    'solved', r.solved,
    'total', v_total,
    'timeTakenMs', case when r.last is not null and r.started_at is not null
      then public.ctf_ms(r.last) - public.ctf_ms(r.started_at) end,
    'lastSolveAt', public.ctf_ms(r.last),
    'finished', v_total > 0 and r.solved = v_total
  ) order by r.score desc, (r.last - r.started_at) asc nulls last, r.name), '[]'::jsonb)
  into v_result
  from r;

  return v_result;
end;
$$;

-- Missions with flags and solve counts. Admins only.
create function public.ctf_admin_missions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  perform public.ctf_require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'order', m.ord,
    'title', m.title,
    'category', m.category,
    'points', m.points,
    'prompt', m.prompt,
    'attachments', m.attachments,
    'flag', m.flag,
    'solves', (select count(*) from public.ctf_solves s where s.mission_id = m.id and not s.practice)
  ) order by m.ord), '[]'::jsonb)
  into v_result
  from (
    select *, row_number() over (order by position, created_at) as ord from public.ctf_missions
  ) m;
  return v_result;
end;
$$;

-- Saves the new mission order. p_ids = every mission id in the new order.
create function public.ctf_admin_reorder_missions(p_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.ctf_require_admin();
  update public.ctf_missions m
  set position = a.ord
  from unnest(p_ids) with ordinality as a (id, ord)
  where m.id = a.id;
end;
$$;

-- Creates (no id) or updates (with id) a team. A non-empty p_password sets
-- the login password; it is only ever stored as a bcrypt hash.
create function public.ctf_admin_save_team(
  p_id text,
  p_name text,
  p_institution text,
  p_leader text,
  p_email text,
  p_phone text,
  p_members text[],
  p_ieee_id text,
  p_password text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_id text := nullif(trim(coalesce(p_id, '')), '');
  v_next integer;
  v_team public.ctf_teams;
begin
  perform public.ctf_require_admin();

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'TEAM_NAME_REQUIRED';
  end if;
  if exists (select 1 from public.ctf_teams where lower(name) = lower(trim(p_name)) and id is distinct from v_id) then
    raise exception 'TEAM_NAME_TAKEN';
  end if;

  if v_id is null then
    if length(coalesce(p_password, '')) < 6 then
      raise exception 'PASSWORD_TOO_SHORT';
    end if;
    select coalesce(max(nullif(regexp_replace(id, '\D', '', 'g'), '')::integer), 0) + 1
      into v_next from public.ctf_teams;
    v_id := 'TEAM-' || lpad(v_next::text, 3, '0');

    insert into public.ctf_teams (id, name, password_hash, institution, leader, email, phone, members, ieee_id)
    values (
      v_id, trim(p_name), extensions.crypt(p_password, extensions.gen_salt('bf')),
      trim(coalesce(p_institution, '')), trim(coalesce(p_leader, '')), trim(coalesce(p_email, '')),
      trim(coalesce(p_phone, '')), coalesce(p_members, '{}'), trim(coalesce(p_ieee_id, ''))
    )
    returning * into v_team;
  else
    if length(coalesce(p_password, '')) > 0 and length(p_password) < 6 then
      raise exception 'PASSWORD_TOO_SHORT';
    end if;
    update public.ctf_teams set
      name = trim(p_name),
      institution = trim(coalesce(p_institution, '')),
      leader = trim(coalesce(p_leader, '')),
      email = trim(coalesce(p_email, '')),
      phone = trim(coalesce(p_phone, '')),
      members = coalesce(p_members, '{}'),
      ieee_id = trim(coalesce(p_ieee_id, '')),
      password_hash = case when length(coalesce(p_password, '')) > 0
        then extensions.crypt(p_password, extensions.gen_salt('bf')) else password_hash end
    where id = v_id
    returning * into v_team;

    if v_team.id is null then
      raise exception 'TEAM_NOT_FOUND';
    end if;
    -- A new password signs the team out everywhere.
    if length(coalesce(p_password, '')) > 0 then
      delete from public.ctf_sessions where team_id = v_id;
    end if;
  end if;

  return jsonb_build_object(
    'id', v_team.id, 'name', v_team.name, 'institution', v_team.institution,
    'leader', v_team.leader, 'email', v_team.email, 'phone', v_team.phone,
    'members', to_jsonb(v_team.members), 'ieeeId', v_team.ieee_id,
    'createdAt', public.ctf_ms(v_team.created_at)
  );
end;
$$;

-- Clears a team's flags and clock so it starts again from mission 1.
create function public.ctf_admin_reset_team(p_team_id text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.ctf_require_admin();
  delete from public.ctf_solves where team_id = p_team_id;
  delete from public.ctf_progress where team_id = p_team_id;
end;
$$;

revoke execute on function public.ctf_require_admin() from public, anon, authenticated;

-- ---------------------------------------------------------------- grants

grant execute on function public.ctf_get_event() to anon, authenticated;
grant execute on function public.ctf_team_login(text, text) to anon, authenticated;
grant execute on function public.ctf_team_logout(uuid) to anon, authenticated;
grant execute on function public.ctf_start(uuid) to anon, authenticated;
grant execute on function public.ctf_player_state(uuid) to anon, authenticated;
grant execute on function public.ctf_submit_flag(uuid, uuid, text) to anon, authenticated;
grant execute on function public.ctf_get_hints(uuid) to anon, authenticated;

revoke execute on function public.ctf_is_admin() from public, anon;
grant execute on function public.ctf_is_admin() to authenticated;
revoke execute on function public.ctf_admin_leaderboard() from public, anon;
grant execute on function public.ctf_admin_leaderboard() to authenticated;
revoke execute on function public.ctf_admin_missions() from public, anon;
grant execute on function public.ctf_admin_missions() to authenticated;
revoke execute on function public.ctf_admin_reorder_missions(uuid[]) from public, anon;
grant execute on function public.ctf_admin_reorder_missions(uuid[]) to authenticated;
revoke execute on function public.ctf_admin_save_team(text, text, text, text, text, text, text[], text, text) from public, anon;
grant execute on function public.ctf_admin_save_team(text, text, text, text, text, text, text[], text, text) to authenticated;
revoke execute on function public.ctf_admin_reset_team(text) from public, anon;
grant execute on function public.ctf_admin_reset_team(text) to authenticated;

-- --------------------------------------------------------------- realtime
-- Admins get row changes (RLS filters them); players get lightweight
-- "something changed" pings on the public broadcast channel and refetch.
alter publication supabase_realtime add table
  public.ctf_settings, public.ctf_missions, public.ctf_progress, public.ctf_solves, public.ctf_hints;
