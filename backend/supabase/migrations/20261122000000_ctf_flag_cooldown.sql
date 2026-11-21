-- 15-second cooldown after a wrong flag, enforced on the server.
-- Requests during the cooldown are refused without being checked or logged,
-- so hammering the endpoint neither guesses flags nor grows the log.
-- Safe to run more than once.

create or replace function public.ctf_submit_flag(p_token uuid, p_mission_id uuid, p_flag text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  c_cooldown constant interval := interval '15 seconds';
  v_team text := public.ctf_session_team(p_token);
  v_closed boolean;
  v_starts timestamptz;
  v_hash text;
  v_points integer;
  v_recent integer;
  v_last_wrong timestamptz;
  v_finished boolean;
begin
  -- Serialise this team's submissions: double clicks, two tabs or a script
  -- firing in parallel are handled strictly one after another.
  perform pg_advisory_xact_lock(hashtextextended('ctf_submit:' || v_team, 0));

  -- Event closed: nothing is checked, scored or logged.
  select closed, starts_at into v_closed, v_starts from public.ctf_settings where id = 1;
  if v_closed then
    return jsonb_build_object('error', 'EVENT_CLOSED');
  end if;
  if v_starts > now() then
    raise exception 'NOT_STARTED';
  end if;

  -- Cooldown after a wrong flag (uses ctf_audit_team_idx).
  select at into v_last_wrong
  from public.ctf_audit
  where team_id = v_team and kind = 'flag_wrong'
  order by at desc
  limit 1;
  if v_last_wrong is not null and v_last_wrong > now() - c_cooldown then
    return jsonb_build_object(
      'error', 'COOLDOWN',
      'retryIn', greatest(1, ceil(extract(epoch from (v_last_wrong + c_cooldown - now()))))::int
    );
  end if;

  -- Backstop in case the cooldown is ever shortened.
  select count(*) into v_recent
  from public.ctf_audit
  where team_id = v_team and kind in ('flag_wrong', 'flag_correct')
    and at > now() - interval '1 minute';
  if v_recent >= 10 then
    if not public.ctf_logged_recently('rate_limited', v_team, interval '1 minute') then
      perform public.ctf_log('rate_limited', v_team, p_mission_id, '');
    end if;
    return jsonb_build_object('error', 'RATE_LIMITED');
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
    return jsonb_build_object('correct', false, 'retryIn', extract(epoch from c_cooldown)::int);
  end if;

  insert into public.ctf_progress (team_id, started_at) values (v_team, now())
  on conflict (team_id) do update set started_at = coalesce(public.ctf_progress.started_at, excluded.started_at);

  insert into public.ctf_solves (team_id, mission_id, practice, points)
  values (v_team, p_mission_id, false, v_points)
  on conflict (team_id, mission_id) do nothing;
  perform public.ctf_log('flag_correct', v_team, p_mission_id, v_points || ' points');

  v_finished := public.ctf_current_mission(v_team) is null;

  return jsonb_build_object('correct', true, 'points', v_points, 'finished', v_finished);
end;
$$;
