-- Maintenance mode for the public website, switched from the control room
-- (Event control -> Website maintenance). No redeploy needed.
--
-- While on, every public page shows "Under maintenance". The hidden CTF
-- portal (/ctf, /ctf-admin, /admin/leaderboard) keeps working.
--
-- Safe to run more than once.

alter table public.ctf_settings
  add column if not exists maintenance boolean not null default false;

-- Public, read-only: the website asks this on load. Returns only the flag.
create or replace function public.ctf_site_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'maintenance', coalesce((select maintenance from public.ctf_settings where id = 1), false)
  );
$$;
revoke execute on function public.ctf_site_status() from public;
grant execute on function public.ctf_site_status() to anon, authenticated;

-- Organisers only: turn maintenance on or off (recorded in the activity log).
create or replace function public.ctf_admin_set_maintenance(p_on boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_on boolean := coalesce(p_on, false);
begin
  perform public.ctf_require_admin();
  update public.ctf_settings set maintenance = v_on where id = 1;
  perform public.ctf_log('admin', null, null,
    public.ctf_actor() || case when v_on then ' turned website maintenance ON' else ' turned website maintenance OFF' end);
  return jsonb_build_object('maintenance', v_on);
end;
$$;
revoke execute on function public.ctf_admin_set_maintenance(boolean) from public, anon;
grant execute on function public.ctf_admin_set_maintenance(boolean) to authenticated;
