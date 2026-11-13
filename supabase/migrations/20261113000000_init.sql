-- Christmas Gift Tracker: initial schema
-- Tables are prefixed gift_ so they can share a Supabase project with other apps.
-- Every row belongs to one user and row level security keeps it private to them.

create type public.gift_status as enum (
  'idea', 'purchased', 'shipped', 'delivered', 'wrapped', 'given'
);

-- One row per user: overall budget, warning threshold and private inbox token.
create table public.gift_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  overall_budget numeric(10, 2) not null default 0 check (overall_budget >= 0),
  warn_pct integer not null default 85 check (warn_pct between 50 and 100),
  inbox_token text not null unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  created_at timestamptz not null default now()
);

create table public.gift_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  relation text,
  budget numeric(10, 2) not null default 0 check (budget >= 0),
  sizes text,
  notes text,
  created_at timestamptz not null default now()
);
create index gift_people_user_id_idx on public.gift_people (user_id);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id uuid not null references public.gift_people (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  url text,
  store text,
  cost numeric(10, 2) not null default 0 check (cost >= 0),
  status public.gift_status not null default 'idea',
  carrier text,
  tracking_number text,
  tracking_url text,
  expected_delivery date,
  delivered_on date,
  order_ref text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gifts_user_id_idx on public.gifts (user_id);
create index gifts_person_id_idx on public.gifts (person_id);
create index gifts_tracking_idx on public.gifts (user_id, tracking_number);
create index gifts_order_ref_idx on public.gifts (user_id, order_ref);

-- Emails forwarded to the user's private inbound address.
create table public.gift_inbound_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_id text not null,
  from_address text,
  subject text,
  received_at timestamptz not null default now(),
  kind text not null default 'unknown' check (kind in ('order', 'shipping', 'unknown')),
  state text not null default 'needs_person'
    check (state in ('needs_person', 'added', 'applied', 'unreadable', 'dismissed')),
  extracted jsonb,
  summary text,
  suggested_person_id uuid references public.gift_people (id) on delete set null,
  gift_id uuid references public.gifts (id) on delete set null,
  previous_gift jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, provider_id)
);
create index gift_inbound_emails_user_idx on public.gift_inbound_emails (user_id, received_at desc);

-- Keep updated_at current.
create function public.gift_touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger gifts_touch before update on public.gifts
  for each row execute function public.gift_touch_updated_at();

-- Make sure a gift's person belongs to the same user.
create function public.check_gift_person() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.gift_people p where p.id = new.person_id and p.user_id = new.user_id
  ) then
    raise exception 'person does not belong to this user';
  end if;
  return new;
end;
$$;
create trigger gifts_check_person before insert or update of person_id, user_id on public.gifts
  for each row execute function public.check_gift_person();

-- Create a profile when someone signs up.
create function public.gift_handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.gift_profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger gift_on_auth_user_created after insert on auth.users
  for each row execute function public.gift_handle_new_user();

revoke execute on function public.gift_handle_new_user() from public, anon, authenticated;
revoke execute on function public.check_gift_person() from public, anon, authenticated;
revoke execute on function public.gift_touch_updated_at() from public, anon, authenticated;

-- Row level security: each user sees and changes only their own rows.
alter table public.gift_profiles enable row level security;
alter table public.gift_people enable row level security;
alter table public.gifts enable row level security;
alter table public.gift_inbound_emails enable row level security;

create policy "gift: own profile read" on public.gift_profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "gift: own profile update" on public.gift_profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "gift: own people" on public.gift_people for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "gift: own gifts" on public.gifts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Inbound emails are written by the server webhook; users can read, update and delete theirs.
create policy "gift: own inbound read" on public.gift_inbound_emails for select to authenticated
  using (user_id = (select auth.uid()));
create policy "gift: own inbound update" on public.gift_inbound_emails for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "gift: own inbound delete" on public.gift_inbound_emails for delete to authenticated
  using (user_id = (select auth.uid()));

-- Users may change their budget settings but not their inbox token.
revoke update on public.gift_profiles from authenticated;
grant update (overall_budget, warn_pct) on public.gift_profiles to authenticated;

-- Accounts that already exist in a shared project get a profile too.
insert into public.gift_profiles (id) select id from auth.users on conflict do nothing;
