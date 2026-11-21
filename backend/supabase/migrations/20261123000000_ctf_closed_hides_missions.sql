-- 1. A closed event no longer counts as "open". (Left over from practice mode:
--    while closed, signed-in teams were still sent their current mission's
--    brief, links and hints, even before the event had started.)
--    ctf_player_state and ctf_get_hints both use this check.
-- 2. ctf_get_event also returns the server's time, so pages time the event
--    by the server's clock, not the visitor's device clock.
-- Safe to run more than once.

create or replace function public.ctf_event_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not closed and starts_at <= now() from public.ctf_settings where id = 1;
$$;

create or replace function public.ctf_get_event()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'startsAt', starts_at,
    'closed', closed,
    'closedMessage', closed_message,
    'serverNow', now()
  )
  from public.ctf_settings where id = 1;
$$;
