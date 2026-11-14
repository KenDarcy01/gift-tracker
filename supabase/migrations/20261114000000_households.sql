-- Shared households: everyone in a household sees and changes the same people,
-- gifts, budgets and inbox. Existing accounts each become a household of one,
-- keeping their data, budgets and inbox address.

create table public.gift_households (
  id uuid primary key default gen_random_uuid(),
  overall_budget numeric(10, 2) not null default 0 check (overall_budget >= 0),
  warn_pct integer not null default 85 check (warn_pct between 50 and 100),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  inbox_token text not null unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  created_at timestamptz not null default now()
);

create table public.gift_members (
  user_id uuid primary key references auth.users (id) on delete cascade, -- one household per person
  household_id uuid not null references public.gift_households (id) on delete cascade,
  joined_at timestamptz not null default now()
);
create index gift_members_household_idx on public.gift_members (household_id);

create table public.gift_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.gift_households (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%'),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, email)
);
create index gift_invites_email_idx on public.gift_invites (email);

-- Backfill: one household per existing gift account.
insert into public.gift_households (id, overall_budget, warn_pct, currency, inbox_token)
select gen_random_uuid(), p.overall_budget, p.warn_pct,
  coalesce(nullif(u.raw_user_meta_data ->> 'gift_currency', ''), 'EUR'), p.inbox_token
from public.gift_profiles p join auth.users u on u.id = p.id;

insert into public.gift_members (user_id, household_id)
select p.id, h.id from public.gift_profiles p join public.gift_households h on h.inbox_token = p.inbox_token;

-- The household a signed-in person belongs to.
create function public.gift_my_household() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.gift_members where user_id = (select auth.uid());
$$;

-- Data rows belong to a household; user_id now just records who added them.
alter table public.gift_people add column household_id uuid references public.gift_households (id) on delete cascade;
alter table public.gifts add column household_id uuid references public.gift_households (id) on delete cascade;
alter table public.gift_inbound_emails add column household_id uuid references public.gift_households (id) on delete cascade;

update public.gift_people t set household_id = m.household_id from public.gift_members m where m.user_id = t.user_id;
update public.gifts t set household_id = m.household_id from public.gift_members m where m.user_id = t.user_id;
update public.gift_inbound_emails t set household_id = m.household_id from public.gift_members m where m.user_id = t.user_id;

alter table public.gift_people alter column household_id set not null;
alter table public.gifts alter column household_id set not null;
alter table public.gift_inbound_emails alter column household_id set not null;
create index gift_people_household_idx on public.gift_people (household_id);
create index gifts_household_idx on public.gifts (household_id);
create index gifts_household_tracking_idx on public.gifts (household_id, tracking_number);
create index gifts_household_order_idx on public.gifts (household_id, order_ref);
create index gift_inbound_household_idx on public.gift_inbound_emails (household_id, received_at desc);

-- user_id records who added a row; rows from the email function have none.
alter table public.gift_people alter column user_id drop not null;
alter table public.gifts alter column user_id drop not null;
alter table public.gift_inbound_emails alter column user_id drop not null;
alter table public.gift_inbound_emails add constraint gift_inbound_emails_household_provider_key unique (household_id, provider_id);

-- Fill household_id from the person adding the row (the app) or the row's user_id (the email function).
create function public.gift_fill_household() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.household_id is null then
    select household_id into new.household_id from public.gift_members
    where user_id = coalesce(new.user_id, (select auth.uid()));
  end if;
  return new;
end;
$$;
-- Named to run before the other insert triggers (they fire in name order).
create trigger gift_people_0_fill_household before insert on public.gift_people
  for each row execute function public.gift_fill_household();
create trigger gifts_0_fill_household before insert on public.gifts
  for each row execute function public.gift_fill_household();
create trigger gift_inbound_0_fill_household before insert on public.gift_inbound_emails
  for each row execute function public.gift_fill_household();

-- A gift's person must be in the same household.
create or replace function public.gift_check_person() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.gift_people p where p.id = new.person_id and p.household_id = new.household_id
  ) then
    raise exception 'person does not belong to this household';
  end if;
  return new;
end;
$$;

-- The original "own ..." policies stay; these add access to everything in your household.
create policy "gift: household people" on public.gift_people for all to authenticated
  using (household_id = (select public.gift_my_household())) with check (household_id = (select public.gift_my_household()));
create policy "gift: household gifts" on public.gifts for all to authenticated
  using (household_id = (select public.gift_my_household())) with check (household_id = (select public.gift_my_household()));
create policy "gift: household inbound read" on public.gift_inbound_emails for select to authenticated
  using (household_id = (select public.gift_my_household()));
create policy "gift: household inbound update" on public.gift_inbound_emails for update to authenticated
  using (household_id = (select public.gift_my_household())) with check (household_id = (select public.gift_my_household()));
create policy "gift: household inbound delete" on public.gift_inbound_emails for delete to authenticated
  using (household_id = (select public.gift_my_household()));

alter table public.gift_households enable row level security;
alter table public.gift_members enable row level security;
alter table public.gift_invites enable row level security;

create policy "gift: full accounts only" on public.gift_households as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy "gift: full accounts only" on public.gift_members as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);
create policy "gift: full accounts only" on public.gift_invites as restrictive for all to authenticated
  using (coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false);

create policy "gift: my household read" on public.gift_households for select to authenticated
  using (id = (select public.gift_my_household()));
create policy "gift: my household update" on public.gift_households for update to authenticated
  using (id = (select public.gift_my_household())) with check (id = (select public.gift_my_household()));
create policy "gift: household members read" on public.gift_members for select to authenticated
  using (household_id = (select public.gift_my_household()));
create policy "gift: household invites read" on public.gift_invites for select to authenticated
  using (household_id = (select public.gift_my_household()));
create policy "gift: household invites delete" on public.gift_invites for delete to authenticated
  using (household_id = (select public.gift_my_household()));

revoke all on public.gift_households, public.gift_members, public.gift_invites from anon, authenticated;
grant select on public.gift_households, public.gift_members, public.gift_invites to authenticated;
grant update (overall_budget, warn_pct, currency) on public.gift_households to authenticated;
grant delete on public.gift_invites to authenticated;

-- Called by the app after sign-in: join the household you were invited to, or start your own.
create function public.gift_join_household() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := (select auth.uid());
  my_email text := lower((select auth.jwt()) ->> 'email');
  current_hh uuid;
  inv_id uuid;
  inv_hh uuid;
begin
  if me is null or coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) then
    raise exception 'sign in first';
  end if;
  select household_id into current_hh from public.gift_members where user_id = me;
  select id, household_id into inv_id, inv_hh from public.gift_invites
    where email = my_email and household_id is distinct from current_hh order by created_at limit 1;

  -- Move to an invited household only while your own one is still empty.
  if inv_id is not null and (current_hh is null or not (
      exists (select 1 from public.gift_people where household_id = current_hh)
      or exists (select 1 from public.gift_inbound_emails where household_id = current_hh))) then
    if current_hh is not null then
      delete from public.gift_members where user_id = me;
      delete from public.gift_households h where h.id = current_hh
        and not exists (select 1 from public.gift_members m where m.household_id = h.id);
    end if;
    insert into public.gift_members (user_id, household_id) values (me, inv_hh);
    delete from public.gift_invites where id = inv_id;
    return inv_hh;
  end if;

  if current_hh is null then
    insert into public.gift_households default values returning id into current_hh;
    insert into public.gift_members (user_id, household_id) values (me, current_hh);
  end if;
  return current_hh;
end;
$$;

-- Invite someone by email to your household.
create function public.gift_invite(invitee text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  hh uuid := public.gift_my_household();
  e text := lower(trim(invitee));
begin
  if hh is null then raise exception 'no household'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That doesn''t look like an email address.'; end if;
  if exists (select 1 from public.gift_members m join auth.users u on u.id = m.user_id
             where m.household_id = hh and lower(u.email) = e) then
    raise exception 'They''re already sharing this list.';
  end if;
  insert into public.gift_invites (household_id, email, invited_by)
  values (hh, e, (select auth.uid())) on conflict (household_id, email) do nothing;
end;
$$;

-- Who shares your household, and who's been invited.
create function public.gift_household_people()
returns table (kind text, id uuid, email text, is_me boolean, since timestamptz)
language sql stable security definer set search_path = '' as $$
  select 'member', m.user_id, u.email::text, m.user_id = (select auth.uid()), m.joined_at
  from public.gift_members m join auth.users u on u.id = m.user_id
  where m.household_id = public.gift_my_household()
  union all
  select 'invite', i.id, i.email, false, i.created_at
  from public.gift_invites i
  where i.household_id = public.gift_my_household()
  order by 1, 5;
$$;

-- Leave a shared household (your gifts stay with it); you start a fresh one next time.
create function public.gift_leave_household() returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if (select count(*) from public.gift_members where household_id = public.gift_my_household()) < 2 then
    raise exception 'You''re the only one on this list.';
  end if;
  delete from public.gift_members where user_id = me;
end;
$$;

revoke execute on function public.gift_my_household(), public.gift_fill_household(), public.gift_join_household(),
  public.gift_invite(text), public.gift_household_people(), public.gift_leave_household() from public, anon;
grant execute on function public.gift_my_household(), public.gift_join_household(), public.gift_invite(text),
  public.gift_household_people(), public.gift_leave_household() to authenticated;
revoke execute on function public.gift_fill_household() from authenticated;

