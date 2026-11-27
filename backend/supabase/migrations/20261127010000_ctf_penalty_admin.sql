-- Control room: give, change or remove a team's point penalty
-- (Leaderboard tab -> Penalty button). Needs 20261127000000_ctf_penalties.sql.
-- Each change is recorded in the activity log.
-- Safe to run more than once.

create or replace function public.ctf_admin_set_penalty(p_team_id text, p_points integer, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_points integer := coalesce(p_points, 0);
  v_note text := left(trim(coalesce(p_note, '')), 200);
  v_name text;
begin
  perform public.ctf_require_admin();
  if v_points < 0 or v_points > 1000000 then raise exception 'BAD_POINTS'; end if;

  update public.ctf_teams
  set penalty_points = v_points,
      penalty_note = case when v_points = 0 then '' else v_note end
  where id = p_team_id
  returning name into v_name;
  if v_name is null then raise exception 'TEAM_NOT_FOUND'; end if;

  perform public.ctf_log('admin', p_team_id, null,
    public.ctf_actor() ||
    case when v_points = 0 then ' removed the penalty for ' || v_name
         else ' set a ' || v_points || '-point penalty for ' || v_name
              || case when v_note <> '' then ' (' || v_note || ')' else '' end
    end);

  return jsonb_build_object('teamId', p_team_id, 'penalty', v_points);
end;
$$;
revoke execute on function public.ctf_admin_set_penalty(text, integer, text) from public, anon;
grant execute on function public.ctf_admin_set_penalty(text, integer, text) to authenticated;
