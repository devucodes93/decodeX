-- DECODEX CTF: rank ties by real time, not by each team's own clock.
-- Run after 20261118000000_ctf_email_login.sql. Safe to re-run.
--
-- Before: ties were broken by (last flag - when that team opened its first
-- mission), so a team that started late and solved fast could outrank teams
-- that finished earlier.
--
-- Now:
--   1. highest points first;
--   2. same points: the team whose last scoring flag came EARLIEST in real
--      time ranks higher (i.e. who reached that score first);
--   3. still tied: team name.
-- The time shown is measured from the event start set by the organisers.

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
      t.id, t.name, t.institution,
      count(x.mission_id) filter (where not x.practice) as solved,
      coalesce(sum(x.points) filter (where not x.practice), 0) as score,
      max(x.solved_at) filter (where not x.practice) as last
    from public.ctf_teams t
    left join public.ctf_solves x on x.team_id = t.id
    group by t.id, t.name, t.institution
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'teamId', r.id,
    'teamName', r.name,
    'institution', r.institution,
    'score', r.score,
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
