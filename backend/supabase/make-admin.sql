-- Give a Supabase Auth user access to the CTF control room (/ctf-admin).
--
-- 1. Supabase dashboard -> Authentication -> Users -> "Add user" -> create the
--    organiser with an email and password (tick "Auto confirm user").
-- 2. Replace the email below and run this in the SQL editor.

insert into public.ctf_admins (user_id)
select id from auth.users where email = 'organiser@example.com'
on conflict (user_id) do nothing;

-- Remove an admin:
-- delete from public.ctf_admins
-- where user_id = (select id from auth.users where email = 'organiser@example.com');
