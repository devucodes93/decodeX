-- Point penalties (e.g. for teams caught sharing flags).
--
-- A team's score = points from captured flags - its penalty. The flag count
-- is unchanged. Ranking uses the penalised score everywhere: the control
-- room leaderboard, /admin/leaderboard and the team's own score.
--
-- Set or clear a penalty in Supabase -> SQL Editor:
--   update public.ctf_teams set penalty_points = 300, penalty_note = 'Shared flags'
--   where lower(name) = lower('Team name here');
-- (set penalty_points = 0 to remove it)
--
-- Safe to run more than once.

alter table public.ctf_teams
  add column if not exists penalty_points integer not null default 0,
  add column if not exists penalty_note text not null default '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ctf_teams_penalty_points_check') then
    alter table public.ctf_teams
      add constraint ctf_teams_penalty_points_check check (penalty_points >= 0 and penalty_points <= 1000000);
  end if;
end;
$$;

-- -------------------------------------------------------------- leaderboard
-- Same as 20261119000000_ctf_rank_by_event_time.sql, minus penalties, plus
-- `penalty` / `penaltyNote` so organisers can see why a score is lower.

create or replace function public.ctf_admin_leaderboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_start timestamptz;
  v_result jsonb;
begin
  perform public.ctf_require_admin();
  select count(*) into v_total from public.ctf_missions;
  select starts_at into v_start from public.ctf_settings where id = 1;

  with r as (
    select
      t.id, t.name, t.institution, t.penalty_points, t.penalty_note,
      count(x.mission_id) filter (where not x.practice) as solved,
      coalesce(sum(x.points) filter (where not x.practice), 0) - t.penalty_points as score,
      max(x.solved_at) filter (where not x.practice) as last
    from public.ctf_teams t
    left join public.ctf_solves x on x.team_id = t.id
    group by t.id, t.name, t.institution, t.penalty_points, t.penalty_note
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'teamId', r.id,
    'teamName', r.name,
    'institution', r.institution,
    'score', r.score,
    'penalty', r.penalty_points,
    'penaltyNote', r.penalty_note,
    'solved', r.solved,
    'total', v_total,
    -- time from the event start (organisers) to this team's last scoring flag
    'timeTakenMs', case when r.last is not null
      then greatest(public.ctf_ms(r.last) - public.ctf_ms(v_start), 0) end,
    'lastSolveAt', public.ctf_ms(r.last),
    'finished', v_total > 0 and r.solved = v_total
  ) order by r.score desc, r.last asc nulls last, r.name), '[]'::jsonb)
  into v_result
  from r;

  return v_result;
end;
$$;
revoke execute on function public.ctf_admin_leaderboard() from public, anon;
grant execute on function public.ctf_admin_leaderboard() to authenticated;

-- ------------------------------------------------------------- player state
-- Same as 20261120000000_ctf_races_and_privacy.sql, except the team's own
-- score is shown after its penalty (so it matches the leaderboard).

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
    coalesce(jsonb_agg(
      case when t.solved or t.practiced or (v_open and t.id = v_current) then
        jsonb_build_object(
          'id', t.id,
          'order', t.ord,
          'points', t.points,
          'status', case when t.solved then 'solved' when t.practiced then 'practice' else 'current' end,
          'title', t.title,
          'category', t.category
        )
      else
        jsonb_build_object('id', null, 'order', t.ord, 'points', null, 'status', 'locked', 'title', null, 'category', null)
      end
      order by t.ord), '[]'::jsonb),
    count(*),
    count(*) filter (where t.solved),
    count(*) filter (where t.solved or t.practiced),
    max(t.solved_at)
  into v_slots, v_total, v_solved, v_done, v_last
  from public.ctf_team_missions(v_team) t;

  select coalesce(sum(points), 0) into v_score
  from public.ctf_solves where team_id = v_team and not practice;
  v_score := v_score - coalesce((select penalty_points from public.ctf_teams where id = v_team), 0);

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
grant execute on function public.ctf_player_state(uuid) to anon, authenticated;
