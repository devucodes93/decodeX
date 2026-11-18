-- DECODEX CTF security hardening. Run after 20261117000000_ctf.sql.
--
-- Fixes the classes of problems seen in the sparc CTF:
--   * Answers visible to players  -> flags are stored only as salted hashes;
--     no function returns them, not even to admins.
--   * Scores jumping up and down  -> a score is the sum of point values
--     captured at solve time, one row per team per mission (primary key), and
--     each team's submissions are processed one at a time (advisory lock).
--     Browsers can never write scores, times or progress.
--   * Brute force / scripting     -> per-team rate limit on flag submissions,
--     lockout after repeated failed logins (per team ID and IP address, so a
--     prankster can't lock a real team out), sessions expire.
--   * "Someone did something"     -> every login, submission and admin change
--     is recorded in ctf_audit, visible in the control room.
--   * SQL injection               -> no dynamic SQL anywhere; every value is a
--     typed function parameter. All functions pin search_path.
--
-- Functions that record something in the activity log and then refuse the
-- request return {"error": "..."} instead of raising, because raising would
-- roll back the log entry too.

-- -------------------------------------------------------------- helpers

-- Flags are compared after trimming and lower-casing. They are hashed as
-- sha256 first (fixed length; bcrypt only reads 72 bytes), then bcrypt.
create function public.ctf_flag_digest(p_flag text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(lower(trim(coalesce(p_flag, ''))), 'sha256'), 'hex');
$$;
revoke execute on function public.ctf_flag_digest(text) from public, anon, authenticated;

-- Who is making an admin change (for the activity log).
create function public.ctf_actor()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select email from auth.users where id = auth.uid()), 'unknown');
$$;
revoke execute on function public.ctf_actor() from public, anon, authenticated;

-- ---------------------------------------------------------- flag hashing

alter table public.ctf_missions add column flag_hash text;
update public.ctf_missions
  set flag_hash = extensions.crypt(public.ctf_flag_digest(flag), extensions.gen_salt('bf', 8));
alter table public.ctf_missions alter column flag_hash set not null;
alter table public.ctf_missions drop column flag;

-- ------------------------------------------------- points fixed at solve time

alter table public.ctf_solves add column points integer not null default 0;
update public.ctf_solves x set points = m.points from public.ctf_missions m where m.id = x.mission_id;

-- ------------------------------------------------------------- activity log

create table public.ctf_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null check (kind in (
    'login', 'login_failed', 'login_locked',
    'flag_correct', 'flag_wrong', 'flag_practice', 'rate_limited',
    'admin'
  )),
  team_id text,          -- no foreign key: history survives team deletion
  mission_id uuid,       -- no foreign key: history survives mission deletion
  ip text not null default '',
  detail text not null default ''
);
create index ctf_audit_at_idx on public.ctf_audit (at desc);
create index ctf_audit_team_idx on public.ctf_audit (team_id, kind, at desc);

-- Caller's IP address as forwarded by Supabase ('' when unknown).
create function public.ctf_client_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_headers json;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  return left(trim(coalesce(
    v_headers->>'cf-connecting-ip',
    split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1),
    ''
  )), 64);
exception when others then
  return '';
end;
$$;
revoke execute on function public.ctf_client_ip() from public, anon, authenticated;

alter table public.ctf_audit enable row level security;
create policy "admins read audit" on public.ctf_audit
  for select to authenticated using (public.ctf_is_admin());

create function public.ctf_log(p_kind text, p_team text, p_mission uuid, p_detail text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.ctf_audit (kind, team_id, mission_id, ip, detail)
  values (p_kind, p_team, p_mission, public.ctf_client_ip(), left(coalesce(p_detail, ''), 300));
$$;
revoke execute on function public.ctf_log(text, text, uuid, text) from public, anon, authenticated;

-- Hints are still inserted directly by admins; log them too.
create function public.ctf_hints_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.ctf_log('admin', new.team_id, new.mission_id,
      public.ctf_actor() || ' sent a hint to ' || new.target_kind || ': ' || new.message);
    return new;
  end if;
  perform public.ctf_log('admin', old.team_id, old.mission_id,
    public.ctf_actor() || ' deleted a hint: ' || old.message);
  return old;
end;
$$;

create trigger ctf_hints_audit
after insert or delete on public.ctf_hints
for each row execute function public.ctf_hints_audit();

-- ------------------------------------------------- lock down direct access
-- Browsers may only READ what the control room lists, and only admins pass
-- row-level security. Every change goes through a function below.

revoke all on public.ctf_settings, public.ctf_admins, public.ctf_missions, public.ctf_teams,
  public.ctf_sessions, public.ctf_progress, public.ctf_solves, public.ctf_hints, public.ctf_audit
  from anon, authenticated;

grant select (id, name, institution, leader, email, phone, members, ieee_id, created_at)
  on public.ctf_teams to authenticated;
grant select on public.ctf_progress, public.ctf_solves, public.ctf_audit, public.ctf_admins to authenticated;
grant select, insert, delete on public.ctf_hints to authenticated;

-- Realtime: only tables admins watch live.
alter publication supabase_realtime drop table public.ctf_settings, public.ctf_missions;
alter publication supabase_realtime add table public.ctf_audit;

-- ------------------------------------------------------------ sessions

-- Sessions last 12 hours.
create or replace function public.ctf_session_team(p_token uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_team text;
begin
  select team_id into v_team
  from public.ctf_sessions
  where token = p_token and created_at > now() - interval '12 hours';
  if v_team is null then
    raise exception 'SESSION_EXPIRED';
  end if;
  return v_team;
end;
$$;

-- Lockout: 8 failed logins for a team ID from one IP address within 15
-- minutes blocks that ID from that address for the rest of the window.
-- Returns {"error": ...} on failure so the attempt stays in the log.
create or replace function public.ctf_team_login(p_team_id text, p_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_id text := upper(left(trim(coalesce(p_team_id, '')), 40));
  v_team public.ctf_teams;
  v_token uuid;
  v_failures integer;
begin
  select count(*) into v_failures
  from public.ctf_audit
  where team_id = v_id and kind = 'login_failed' and ip = public.ctf_client_ip()
    and at > now() - interval '15 minutes';
  if v_failures >= 8 then
    perform public.ctf_log('login_locked', v_id, null, '');
    return jsonb_build_object('error', 'TOO_MANY_LOGINS');
  end if;

  select * into v_team from public.ctf_teams where upper(id) = v_id;
  -- Always run bcrypt so a wrong team ID takes as long as a wrong password.
  if v_team.id is null
     or v_team.password_hash <> extensions.crypt(coalesce(p_password, ''), coalesce(v_team.password_hash, extensions.gen_salt('bf'))) then
    perform public.ctf_log('login_failed', v_id, null, '');
    return jsonb_build_object('error', 'INVALID_LOGIN');
  end if;

  -- One device per team: signing in ends every other session.
  delete from public.ctf_sessions where team_id = v_team.id;
  insert into public.ctf_sessions (team_id) values (v_team.id) returning token into v_token;
  perform public.ctf_log('login', v_team.id, null, '');

  return jsonb_build_object('token', v_token, 'teamId', v_team.id, 'teamName', v_team.name);
end;
$$;

-- --------------------------------------------------------- flag submission

-- One submission at a time per team (advisory lock), at most 10 per minute,
-- only the current mission, points fixed at solve time.
create or replace function public.ctf_submit_flag(p_token uuid, p_mission_id uuid, p_flag text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_team text := public.ctf_session_team(p_token);
  v_closed boolean;
  v_starts timestamptz;
  v_hash text;
  v_points integer;
  v_recent integer;
  v_finished boolean;
begin
  -- Serialise this team's submissions: double clicks, two tabs or a script
  -- firing in parallel are handled strictly one after another.
  perform pg_advisory_xact_lock(hashtextextended('ctf_submit:' || v_team, 0));

  select count(*) into v_recent
  from public.ctf_audit
  where team_id = v_team and kind in ('flag_wrong', 'flag_correct', 'flag_practice')
    and at > now() - interval '1 minute';
  if v_recent >= 10 then
    perform public.ctf_log('rate_limited', v_team, p_mission_id, '');
    return jsonb_build_object('error', 'RATE_LIMITED');
  end if;

  select closed, starts_at into v_closed, v_starts from public.ctf_settings where id = 1;
  if not v_closed and v_starts > now() then
    raise exception 'NOT_STARTED';
  end if;

  -- Missions unlock in order: only the current one can be answered. This
  -- also makes a repeated correct submission a no-op.
  if public.ctf_current_mission(v_team) is distinct from p_mission_id then
    raise exception 'NOT_CURRENT';
  end if;

  select flag_hash, points into v_hash, v_points from public.ctf_missions where id = p_mission_id;
  if v_hash is null
     or v_hash <> extensions.crypt(public.ctf_flag_digest(left(coalesce(p_flag, ''), 500)), v_hash) then
    perform public.ctf_log('flag_wrong', v_team, p_mission_id, '');
    return jsonb_build_object('correct', false);
  end if;

  if v_closed then
    insert into public.ctf_solves (team_id, mission_id, practice, points)
    values (v_team, p_mission_id, true, 0)
    on conflict (team_id, mission_id) do nothing;
    perform public.ctf_log('flag_practice', v_team, p_mission_id, '');
  else
    insert into public.ctf_progress (team_id, started_at) values (v_team, now())
    on conflict (team_id) do update set started_at = coalesce(public.ctf_progress.started_at, excluded.started_at);

    insert into public.ctf_solves (team_id, mission_id, practice, points)
    values (v_team, p_mission_id, false, v_points)
    on conflict (team_id, mission_id) do update
      set practice = false, solved_at = now(), points = excluded.points
      where public.ctf_solves.practice;
    perform public.ctf_log('flag_correct', v_team, p_mission_id, v_points || ' points');
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

-- Score = points captured at solve time (stable if an admin edits points later).
create or replace function public.ctf_player_state(p_token uuid)
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
      'title', case when t.solved or t.practiced or (v_open and t.id = v_current) then t.title end,
      'category', case when t.solved or t.practiced or (v_open and t.id = v_current) then t.category end
    ) order by t.ord), '[]'::jsonb),
    count(*),
    count(*) filter (where t.solved),
    count(*) filter (where t.solved or t.practiced),
    max(t.solved_at)
  into v_slots, v_total, v_solved, v_done, v_last
  from public.ctf_team_missions(v_team) t;

  select coalesce(sum(points), 0) into v_score
  from public.ctf_solves where team_id = v_team and not practice;

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

-- ---------------------------------------------------------------- admin

create or replace function public.ctf_admin_leaderboard()
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
      coalesce(sum(x.points) filter (where not x.practice), 0) as score,
      max(x.solved_at) filter (where not x.practice) as last
    from public.ctf_teams t
    left join public.ctf_progress p on p.team_id = t.id
    left join public.ctf_solves x on x.team_id = t.id
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

-- Missions for the control room. Flags are never returned.
create or replace function public.ctf_admin_missions()
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
    'solves', (select count(*) from public.ctf_solves s where s.mission_id = m.id and not s.practice)
  ) order by m.ord), '[]'::jsonb)
  into v_result
  from (
    select *, row_number() over (order by position, created_at) as ord from public.ctf_missions
  ) m;
  return v_result;
end;
$$;

-- Creates (p_id null) or updates a mission. p_flag is required for a new
-- mission; on edit, an empty p_flag keeps the current flag. Only http(s)
-- links are accepted for files.
create function public.ctf_admin_save_mission(
  p_id uuid,
  p_title text,
  p_category text,
  p_points integer,
  p_prompt text,
  p_attachments jsonb,
  p_flag text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_files jsonb := '[]'::jsonb;
  v_item jsonb;
  v_url text;
  v_flag text := trim(coalesce(p_flag, ''));
  v_row public.ctf_missions;
begin
  perform public.ctf_require_admin();

  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'TITLE_REQUIRED'; end if;
  if p_points is null or p_points < 0 or p_points > 100000 then raise exception 'BAD_POINTS'; end if;
  if p_id is null and v_flag = '' then raise exception 'FLAG_REQUIRED'; end if;
  if length(v_flag) > 500 then raise exception 'FLAG_TOO_LONG'; end if;

  -- Rebuild attachments from known keys only; reject non-http(s) links.
  if p_attachments is not null and jsonb_typeof(p_attachments) = 'array' then
    for v_item in select * from jsonb_array_elements(p_attachments) loop
      continue when jsonb_typeof(v_item) <> 'object' or length(trim(coalesce(v_item->>'label', ''))) = 0;
      v_url := nullif(trim(coalesce(v_item->>'url', '')), '');
      if v_url is not null and v_url !~* '^https?://[^\s]+$' then
        raise exception 'BAD_URL';
      end if;
      v_files := v_files || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'label', left(trim(v_item->>'label'), 120),
        'size', nullif(left(trim(coalesce(v_item->>'size', '')), 30), ''),
        'url', left(v_url, 1000)
      )));
    end loop;
  end if;

  if p_id is null then
    insert into public.ctf_missions (title, category, points, prompt, attachments, flag_hash)
    values (
      left(trim(p_title), 200), coalesce(nullif(left(trim(coalesce(p_category, '')), 60), ''), 'General'),
      p_points, left(coalesce(p_prompt, ''), 10000), v_files,
      extensions.crypt(public.ctf_flag_digest(v_flag), extensions.gen_salt('bf', 8))
    )
    returning * into v_row;
    perform public.ctf_log('admin', null, v_row.id, public.ctf_actor() || ' added mission "' || v_row.title || '"');
  else
    update public.ctf_missions set
      title = left(trim(p_title), 200),
      category = coalesce(nullif(left(trim(coalesce(p_category, '')), 60), ''), 'General'),
      points = p_points,
      prompt = left(coalesce(p_prompt, ''), 10000),
      attachments = v_files,
      flag_hash = case when v_flag = '' then flag_hash
        else extensions.crypt(public.ctf_flag_digest(v_flag), extensions.gen_salt('bf', 8)) end
    where id = p_id
    returning * into v_row;
    if v_row.id is null then raise exception 'MISSION_NOT_FOUND'; end if;
    perform public.ctf_log('admin', null, v_row.id, public.ctf_actor() || ' edited mission "' || v_row.title || '"'
      || case when v_flag = '' then '' else ' (new flag)' end);
  end if;

  return jsonb_build_object('id', v_row.id, 'title', v_row.title);
end;
$$;

create function public.ctf_admin_delete_mission(p_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  perform public.ctf_require_admin();
  delete from public.ctf_missions where id = p_id returning title into v_title;
  if v_title is not null then
    perform public.ctf_log('admin', null, p_id, public.ctf_actor() || ' deleted mission "' || v_title || '"');
  end if;
end;
$$;

create or replace function public.ctf_admin_reorder_missions(p_ids uuid[])
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
  perform public.ctf_log('admin', null, null, public.ctf_actor() || ' reordered missions');
end;
$$;

create or replace function public.ctf_admin_save_team(
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
  v_name text := left(trim(coalesce(p_name, '')), 80);
  v_members text[] := (select coalesce(array_agg(left(trim(m), 80)), '{}') from unnest(coalesce(p_members, '{}')) m where trim(m) <> '');
begin
  perform public.ctf_require_admin();

  if v_name = '' then raise exception 'TEAM_NAME_REQUIRED'; end if;
  if exists (select 1 from public.ctf_teams where lower(name) = lower(v_name) and id is distinct from v_id) then
    raise exception 'TEAM_NAME_TAKEN';
  end if;
  if length(coalesce(p_password, '')) > 0 and length(p_password) < 6 then
    raise exception 'PASSWORD_TOO_SHORT';
  end if;

  if v_id is null then
    if length(coalesce(p_password, '')) = 0 then raise exception 'PASSWORD_TOO_SHORT'; end if;
    select coalesce(max(nullif(regexp_replace(id, '\D', '', 'g'), '')::integer), 0) + 1
      into v_next from public.ctf_teams;
    v_id := 'TEAM-' || lpad(v_next::text, 3, '0');

    insert into public.ctf_teams (id, name, password_hash, institution, leader, email, phone, members, ieee_id)
    values (
      v_id, v_name, extensions.crypt(p_password, extensions.gen_salt('bf')),
      left(trim(coalesce(p_institution, '')), 120), left(trim(coalesce(p_leader, '')), 80),
      left(trim(coalesce(p_email, '')), 120), left(trim(coalesce(p_phone, '')), 40),
      v_members, left(trim(coalesce(p_ieee_id, '')), 40)
    )
    returning * into v_team;
    perform public.ctf_log('admin', v_id, null, public.ctf_actor() || ' created team ' || v_name);
  else
    update public.ctf_teams set
      name = v_name,
      institution = left(trim(coalesce(p_institution, '')), 120),
      leader = left(trim(coalesce(p_leader, '')), 80),
      email = left(trim(coalesce(p_email, '')), 120),
      phone = left(trim(coalesce(p_phone, '')), 40),
      members = v_members,
      ieee_id = left(trim(coalesce(p_ieee_id, '')), 40),
      password_hash = case when length(coalesce(p_password, '')) > 0
        then extensions.crypt(p_password, extensions.gen_salt('bf')) else password_hash end
    where id = v_id
    returning * into v_team;

    if v_team.id is null then raise exception 'TEAM_NOT_FOUND'; end if;
    if length(coalesce(p_password, '')) > 0 then
      delete from public.ctf_sessions where team_id = v_id;
      perform public.ctf_log('admin', v_id, null, public.ctf_actor() || ' set a new password for ' || v_name);
    else
      perform public.ctf_log('admin', v_id, null, public.ctf_actor() || ' edited team ' || v_name);
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

create function public.ctf_admin_delete_team(p_team_id text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  perform public.ctf_require_admin();
  delete from public.ctf_teams where id = p_team_id returning name into v_name;
  if v_name is not null then
    perform public.ctf_log('admin', p_team_id, null, public.ctf_actor() || ' deleted team ' || v_name);
  end if;
end;
$$;

create or replace function public.ctf_admin_reset_team(p_team_id text)
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
  perform public.ctf_log('admin', p_team_id, null, public.ctf_actor() || ' reset progress for ' || p_team_id);
end;
$$;

-- Null arguments leave a setting unchanged.
create function public.ctf_admin_update_event(p_starts_at timestamptz, p_closed boolean, p_closed_message text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_changes text := '';
begin
  perform public.ctf_require_admin();
  update public.ctf_settings set
    starts_at = coalesce(p_starts_at, starts_at),
    closed = coalesce(p_closed, closed),
    closed_message = coalesce(left(p_closed_message, 500), closed_message)
  where id = 1;

  if p_starts_at is not null then v_changes := v_changes || ' start time ' || to_char(p_starts_at at time zone 'Asia/Kolkata', 'DD Mon HH24:MI') || ' IST;'; end if;
  if p_closed is not null then v_changes := v_changes || case when p_closed then ' closed the event;' else ' reopened the event;' end; end if;
  if p_closed_message is not null then v_changes := v_changes || ' closing message;'; end if;
  perform public.ctf_log('admin', null, null, public.ctf_actor() || ' changed' || v_changes);
end;
$$;

-- Latest activity for the control room (newest first).
create function public.ctf_admin_activity(p_limit integer default 200)
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
    'id', a.id,
    'at', public.ctf_ms(a.at),
    'kind', a.kind,
    'teamId', a.team_id,
    'teamName', t.name,
    'missionTitle', m.title,
    'ip', a.ip,
    'detail', a.detail
  ) order by a.id desc), '[]'::jsonb)
  into v_result
  from (
    select * from public.ctf_audit order by id desc limit least(greatest(coalesce(p_limit, 200), 1), 1000)
  ) a
  left join public.ctf_teams t on t.id = a.team_id
  left join public.ctf_missions m on m.id = a.mission_id;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------- grants

revoke execute on function public.ctf_admin_save_mission(uuid, text, text, integer, text, jsonb, text) from public, anon;
grant execute on function public.ctf_admin_save_mission(uuid, text, text, integer, text, jsonb, text) to authenticated;
revoke execute on function public.ctf_admin_delete_mission(uuid) from public, anon;
grant execute on function public.ctf_admin_delete_mission(uuid) to authenticated;
revoke execute on function public.ctf_admin_delete_team(text) from public, anon;
grant execute on function public.ctf_admin_delete_team(text) to authenticated;
revoke execute on function public.ctf_admin_update_event(timestamptz, boolean, text) from public, anon;
grant execute on function public.ctf_admin_update_event(timestamptz, boolean, text) to authenticated;
revoke execute on function public.ctf_admin_activity(integer) from public, anon;
grant execute on function public.ctf_admin_activity(integer) to authenticated;
