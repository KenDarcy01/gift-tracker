-- This project allows anonymous sign-ins for other apps. Gift data is for full accounts only.
create policy "gift: full accounts only" on public.gift_profiles as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy "gift: full accounts only" on public.gift_people as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy "gift: full accounts only" on public.gifts as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy "gift: full accounts only" on public.gift_inbound_emails as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

-- Anonymous sign-ups (used by other apps here) don't get a gift profile.
create or replace function public.gift_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.is_anonymous, false) then return new; end if;
  insert into public.gift_profiles (id) values (new.id) on conflict do nothing;
  return new;
exception when others then
  -- Never block sign-ups for other apps sharing this project.
  raise warning 'gift_handle_new_user failed: %', sqlerrm;
  return new;
end;
$$;

-- Lets the app create a missing profile (e.g. an account that started anonymous in another app).
create policy "gift: own profile insert" on public.gift_profiles for insert to authenticated
  with check (id = (select auth.uid()));
revoke insert on public.gift_profiles from authenticated;
grant insert (id) on public.gift_profiles to authenticated;
