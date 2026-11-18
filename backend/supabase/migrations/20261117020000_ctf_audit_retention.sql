-- DECODEX CTF: keep the activity log small. Run after 20261117010000_ctf_hardening.sql.
--
-- 1. Retention, automatic (no cron needed). Every 500th log entry prunes:
--      * routine entries (logins, wrong flags, lockouts) older than 30 days,
--      * everything older than 365 days,
--      * routine entries beyond the newest 200,000 rows.
--    Captured flags and admin changes are kept for a year.
-- 2. Spam can't fill the log:
--      * "login locked" / "rate limited" are recorded at most once a minute
--        per team and IP address, however many requests arrive;
--      * one IP address gets at most 30 failed logins per 15 minutes across
--        all team IDs (stops guessing with random team IDs);
--      * at most 20 successful logins per team per 15 minutes.
--    Flag submissions were already capped at 10 per team per minute.
--
-- Size: an entry is roughly 150-250 bytes, so even 200,000 rows is ~50 MB.
-- A normal event produces a few thousand.

-- ------------------------------------------------------------ retention

create function public.ctf_prune_audit()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_max bigint;
begin
  delete from public.ctf_audit
  where at < now() - interval '365 days'
     or (kind in ('login', 'login_failed', 'login_locked', 'flag_wrong', 'rate_limited')
         and at < now() - interval '30 days');

  select max(id) into v_max from public.ctf_audit;
  if v_max is not null then
    delete from public.ctf_audit
    where id < v_max - 200000
      and kind in ('login', 'login_failed', 'login_locked', 'flag_wrong', 'rate_limited');
  end if;
end;
$$;
revoke execute on function public.ctf_prune_audit() from public, anon, authenticated;

create or replace function public.ctf_log(p_kind text, p_team text, p_mission uuid, p_detail text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.ctf_audit (kind, team_id, mission_id, ip, detail)
  values (p_kind, p_team, p_mission, public.ctf_client_ip(), left(coalesce(p_detail, ''), 300))
  returning id into v_id;

  if v_id % 500 = 0 then
    perform public.ctf_prune_audit();
  end if;
end;
$$;

-- True if the same kind of entry was logged for this team and IP within the window.
create function public.ctf_logged_recently(p_kind text, p_team text, p_window interval)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ctf_audit
    where kind = p_kind
      and team_id is not distinct from p_team
      and ip = public.ctf_client_ip()
      and at > now() - p_window
  );
$$;
revoke execute on function public.ctf_logged_recently(text, text, interval) from public, anon, authenticated;

-- ---------------------------------------------------------------- login

create or replace function public.ctf_team_login(p_team_id text, p_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_id text := upper(left(trim(coalesce(p_team_id, '')), 40));
  v_ip text := public.ctf_client_ip();
  v_team public.ctf_teams;
  v_token uuid;
  v_blocked boolean;
begin
  v_blocked :=
    -- 8 wrong passwords for this team ID from this IP in 15 minutes
    (select count(*) from public.ctf_audit
      where team_id = v_id and kind = 'login_failed' and ip = v_ip
        and at > now() - interval '15 minutes') >= 8
    -- 30 wrong passwords from this IP for any team IDs in 15 minutes
    or (v_ip <> '' and (select count(*) from public.ctf_audit
      where kind = 'login_failed' and ip = v_ip
        and at > now() - interval '15 minutes') >= 30)
    -- 20 successful logins for this team in 15 minutes (login spam)
    or (select count(*) from public.ctf_audit
      where team_id = v_id and kind = 'login'
        and at > now() - interval '15 minutes') >= 20;

  if v_blocked then
    if not public.ctf_logged_recently('login_locked', v_id, interval '1 minute') then
      perform public.ctf_log('login_locked', v_id, null, '');
    end if;
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

-- ------------------------------------------------------- flag submission

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
    if not public.ctf_logged_recently('rate_limited', v_team, interval '1 minute') then
      perform public.ctf_log('rate_limited', v_team, p_mission_id, '');
    end if;
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

-- Supports the per-IP checks above.
create index ctf_audit_ip_idx on public.ctf_audit (ip, kind, at desc);
