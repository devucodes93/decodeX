-- DECODEX CTF: teams sign in with the team lead's email. Run after
-- 20261117020000_ctf_audit_retention.sql.
--
-- * ctf_team_login accepts the team lead's email (a team ID still works).
-- * Every team needs an email, and no two teams can share one.

-- Fails if two teams already share an email: fix those in the control room first.
create unique index ctf_teams_email_key on public.ctf_teams (lower(email)) where email <> '';

create or replace function public.ctf_team_login(p_team_id text, p_password text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_input text := left(trim(coalesce(p_team_id, '')), 120);
  v_is_email boolean := position('@' in v_input) > 0;
  -- key used for lockouts and the activity log
  v_key text := case when v_is_email then lower(v_input) else upper(v_input) end;
  v_ip text := public.ctf_client_ip();
  v_team public.ctf_teams;
  v_token uuid;
  v_blocked boolean;
begin
  v_blocked :=
    (select count(*) from public.ctf_audit
      where team_id = v_key and kind = 'login_failed' and ip = v_ip
        and at > now() - interval '15 minutes') >= 8
    or (v_ip <> '' and (select count(*) from public.ctf_audit
      where kind = 'login_failed' and ip = v_ip
        and at > now() - interval '15 minutes') >= 30)
    or (select count(*) from public.ctf_audit
      where team_id = v_key and kind = 'login'
        and at > now() - interval '15 minutes') >= 20;

  if v_blocked then
    if not public.ctf_logged_recently('login_locked', v_key, interval '1 minute') then
      perform public.ctf_log('login_locked', v_key, null, '');
    end if;
    return jsonb_build_object('error', 'TOO_MANY_LOGINS');
  end if;

  if v_is_email then
    select * into v_team from public.ctf_teams where email <> '' and lower(email) = v_key;
  else
    select * into v_team from public.ctf_teams where upper(id) = v_key;
  end if;

  -- Always run bcrypt so an unknown email takes as long as a wrong password.
  if v_team.id is null
     or v_team.password_hash <> extensions.crypt(coalesce(p_password, ''), coalesce(v_team.password_hash, extensions.gen_salt('bf'))) then
    perform public.ctf_log('login_failed', v_key, null, '');
    return jsonb_build_object('error', 'INVALID_LOGIN');
  end if;

  -- One device per team: signing in ends every other session.
  delete from public.ctf_sessions where team_id = v_team.id;
  insert into public.ctf_sessions (team_id) values (v_team.id) returning token into v_token;
  perform public.ctf_log('login', v_team.id, null, '');

  return jsonb_build_object('token', v_token, 'teamId', v_team.id, 'teamName', v_team.name);
end;
$$;

-- Same as before, plus: email required, valid-looking, and unique.
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
  v_email text := lower(left(trim(coalesce(p_email, '')), 120));
  v_members text[] := (select coalesce(array_agg(left(trim(m), 80)), '{}') from unnest(coalesce(p_members, '{}')) m where trim(m) <> '');
begin
  perform public.ctf_require_admin();

  if v_name = '' then raise exception 'TEAM_NAME_REQUIRED'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL_REQUIRED'; end if;
  if exists (select 1 from public.ctf_teams where lower(name) = lower(v_name) and id is distinct from v_id) then
    raise exception 'TEAM_NAME_TAKEN';
  end if;
  if exists (select 1 from public.ctf_teams where email <> '' and lower(email) = v_email and id is distinct from v_id) then
    raise exception 'EMAIL_TAKEN';
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
      v_email, left(trim(coalesce(p_phone, '')), 40),
      v_members, left(trim(coalesce(p_ieee_id, '')), 40)
    )
    returning * into v_team;
    perform public.ctf_log('admin', v_id, null, public.ctf_actor() || ' created team ' || v_name);
  else
    update public.ctf_teams set
      name = v_name,
      institution = left(trim(coalesce(p_institution, '')), 120),
      leader = left(trim(coalesce(p_leader, '')), 80),
      email = v_email,
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
