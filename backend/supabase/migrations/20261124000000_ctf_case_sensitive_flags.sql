-- Case-sensitive flags.
--
-- Before: flags were trimmed and lower-cased before hashing, so
-- DECODEX{Abc} and decodex{abc} both counted as correct.
-- Now: a flag saved after this migration must match exactly, capitals
-- included. Only spaces at the very start/end are still ignored.
--
-- Missions saved BEFORE this migration keep working as before
-- (case-insensitive): their stored hash was made from the lower-cased flag,
-- so the original capitals can't be recovered. Re-enter the flag on those
-- missions (control room -> Missions -> Edit) to make them case-sensitive;
-- the control room marks them until you do.
--
-- Safe to run more than once.

alter table public.ctf_missions
  add column if not exists flag_case_sensitive boolean not null default false;

-- Exact digest: trimmed, NOT lower-cased. sha256 first (fixed length; bcrypt
-- only reads 72 bytes), then bcrypt, same as ctf_flag_digest.
create or replace function public.ctf_flag_digest_exact(p_flag text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(trim(coalesce(p_flag, '')), 'sha256'), 'hex');
$$;
revoke execute on function public.ctf_flag_digest_exact(text) from public, anon, authenticated;

-- ---------------------------------------------------------------- submit
-- Same as 20261122000000_ctf_flag_cooldown.sql, except the flag check uses
-- the exact digest for case-sensitive missions.

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
  v_exact boolean;
  v_points integer;
  v_recent integer;
  v_last_wrong timestamptz;
  v_finished boolean;
  v_input text := left(coalesce(p_flag, ''), 500);
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

  select flag_hash, flag_case_sensitive, points into v_hash, v_exact, v_points
  from public.ctf_missions where id = p_mission_id;
  if v_hash is null
     or v_hash <> extensions.crypt(
          case when v_exact then public.ctf_flag_digest_exact(v_input)
               else public.ctf_flag_digest(v_input) end,
          v_hash) then
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

-- ---------------------------------------------------------- save mission
-- Same as 20261117010000_ctf_hardening.sql, except a new or replaced flag is
-- stored with the exact (case-sensitive) digest and marks the mission
-- case-sensitive. Leaving the flag empty on edit keeps the current flag and
-- its current mode.

create or replace function public.ctf_admin_save_mission(
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
    insert into public.ctf_missions (title, category, points, prompt, attachments, flag_hash, flag_case_sensitive)
    values (
      left(trim(p_title), 200), coalesce(nullif(left(trim(coalesce(p_category, '')), 60), ''), 'General'),
      p_points, left(coalesce(p_prompt, ''), 10000), v_files,
      extensions.crypt(public.ctf_flag_digest_exact(v_flag), extensions.gen_salt('bf', 8)),
      true
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
        else extensions.crypt(public.ctf_flag_digest_exact(v_flag), extensions.gen_salt('bf', 8)) end,
      flag_case_sensitive = case when v_flag = '' then flag_case_sensitive else true end
    where id = p_id
    returning * into v_row;
    if v_row.id is null then raise exception 'MISSION_NOT_FOUND'; end if;
    perform public.ctf_log('admin', null, v_row.id, public.ctf_actor() || ' edited mission "' || v_row.title || '"'
      || case when v_flag = '' then '' else ' (new flag)' end);
  end if;

  return jsonb_build_object('id', v_row.id, 'title', v_row.title);
end;
$$;
revoke execute on function public.ctf_admin_save_mission(uuid, text, text, integer, text, jsonb, text) from public, anon;
grant execute on function public.ctf_admin_save_mission(uuid, text, text, integer, text, jsonb, text) to authenticated;

-- ------------------------------------------------------- admin missions
-- Same as 20261117010000_ctf_hardening.sql, plus `caseSensitive` so the
-- control room can mark missions whose flag still needs re-entering.
-- Flags are never returned.

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
    'caseSensitive', m.flag_case_sensitive,
    'solves', (select count(*) from public.ctf_solves s where s.mission_id = m.id and not s.practice)
  ) order by m.ord), '[]'::jsonb)
  into v_result
  from (
    select *, row_number() over (order by position, created_at) as ord from public.ctf_missions
  ) m;
  return v_result;
end;
$$;
revoke execute on function public.ctf_admin_missions() from public, anon;
grant execute on function public.ctf_admin_missions() to authenticated;
