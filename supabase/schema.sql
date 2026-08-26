-- Run this in the Supabase SQL editor after creating your project.
--
-- Matching mechanic (see the MarryMe.sg build spec, Phases 1 & 3):
-- each user gets a weekly batch of 5 curated matches, can express
-- interest in up to 2 of them, and a mutual match unlocks chat.
-- Faith is a hard filter, not a preference: if faith matters to a
-- user, they only see faith-compatible candidates; if it doesn't,
-- they only see other users for whom it also doesn't.

create extension if not exists pgcrypto;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text,
  date_of_birth date,
  gender text check (gender in ('male', 'female')),
  photos text[] not null default '{}',
  bio text,
  location text,
  occupation text,

  role text not null default 'member',     -- 'member' | 'admin'
  status text not null default 'pending',  -- 'pending' | 'approved' | 'suspended'

  -- Faith is asked once, up front, and gates matching rather than
  -- just scoring it (Phase 2 & 3). Never shown or asked again if
  -- the user says it doesn't matter to them.
  faith_matters_to_them boolean not null default false,
  own_faith text,
  open_to_other_faith boolean,

  years_out_of_relationship int,

  -- Standard matching preferences, collected at onboarding.
  preferred_gender text check (preferred_gender in ('male', 'female')),
  preferred_age_min int,
  preferred_age_max int,
  preferred_location text,

  created_at timestamptz not null default now(),

  constraint faith_fields_only_when_relevant check (
    faith_matters_to_them = true or (own_faith is null and open_to_other_faith is null)
  )
);

alter table public.profiles enable row level security;

create policy "Users can view approved profiles"
  on public.profiles for select
  using (status = 'approved' or auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a bare profile row on signup so every later step
-- (onboarding, matching) can assume one exists.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- personality_responses (kept from onboarding; informational only —
-- not currently a matching input, see engine.ts)
-- ============================================================
create table if not exists public.personality_responses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade unique,
  answers jsonb not null,
  completed_at timestamptz default now()
);

alter table public.personality_responses enable row level security;

create policy "Users can manage their own personality responses"
  on public.personality_responses for all
  using (auth.uid() = profile_id);

-- ============================================================
-- matches — one row per (user, candidate) in a curated batch.
-- batch_id is shared by the 5 rows generated for a user at once.
-- ============================================================
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  matched_user_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),

  constraint matches_not_self check (user_id <> matched_user_id),
  unique (user_id, batch_id, matched_user_id)
);

create index if not exists idx_matches_user_batch on public.matches (user_id, batch_id);
create index if not exists idx_matches_expires_at on public.matches (expires_at);

alter table public.matches enable row level security;

create policy "Users can view their own curated matches"
  on public.matches for select
  using (auth.uid() = user_id);

-- ============================================================
-- interests — up to 2 per (user, batch), enforced in application
-- code (the matching engine) rather than a DB constraint, since
-- "up to 2" isn't expressible as a simple unique/check constraint.
-- ============================================================
create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  matched_user_id uuid not null references public.profiles(id) on delete cascade,
  batch_id uuid not null,
  created_at timestamptz not null default now(),

  unique (user_id, matched_user_id, batch_id)
);

create index if not exists idx_interests_user_batch on public.interests (user_id, batch_id);
create index if not exists idx_interests_reverse_lookup on public.interests (matched_user_id, user_id);

alter table public.interests enable row level security;

create policy "Users can view their own expressed interests"
  on public.interests for select
  using (auth.uid() = user_id);

create policy "Users can express interest as themselves"
  on public.interests for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- mutual_matches — created when interest is reciprocal.
-- ============================================================
create table if not exists public.mutual_matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles(id) on delete cascade,
  user_b_id uuid not null references public.profiles(id) on delete cascade,
  matched_at timestamptz not null default now(),
  status text not null default 'active', -- 'active' | 'ended'
  -- Placeholder duration (2 weeks per the build spec) — confirm the
  -- final cooling-off period before launch.
  cooling_off_until timestamptz,

  constraint mutual_matches_not_self check (user_a_id <> user_b_id),
  constraint mutual_matches_ordered_pair check (user_a_id < user_b_id)
);

create index if not exists idx_mutual_matches_user_a on public.mutual_matches (user_a_id);
create index if not exists idx_mutual_matches_user_b on public.mutual_matches (user_b_id);

alter table public.mutual_matches enable row level security;

create policy "Users can view their own mutual matches"
  on public.mutual_matches for select
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "Users can end their own mutual match"
  on public.mutual_matches for update
  using (auth.uid() = user_a_id or auth.uid() = user_b_id)
  with check (auth.uid() = user_a_id or auth.uid() = user_b_id);

create or replace function public.set_cooling_off_on_end()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' and new.cooling_off_until is null then
    new.cooling_off_until := now() + interval '14 days';
  end if;
  return new;
end;
$$;

drop trigger if exists on_mutual_match_ended on public.mutual_matches;
create trigger on_mutual_match_ended
  before update on public.mutual_matches
  for each row execute function public.set_cooling_off_on_end();

-- ============================================================
-- messages — only between two users with an active mutual_match.
-- ============================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  mutual_match_id uuid not null references public.mutual_matches(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_messages_mutual_match on public.messages (mutual_match_id, created_at);

alter table public.messages enable row level security;

create policy "Participants can view messages in their mutual match"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Participants can send messages while the match is active"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.mutual_matches mm
      where mm.id = messages.mutual_match_id
        and mm.status = 'active'
        and (mm.user_a_id = auth.uid() or mm.user_b_id = auth.uid())
        and recipient_id in (mm.user_a_id, mm.user_b_id)
        and recipient_id <> auth.uid()
    )
  );

create policy "Recipients can mark messages read"
  on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- ============================================================
-- memberships — gates access to curated matches (Phase 5, Stripe
-- wiring not yet built; rows are written by the service role).
-- ============================================================
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier text not null check (tier in ('founding', 'regular', 'priority')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  stripe_customer_id text,
  stripe_subscription_id text
);

create index if not exists idx_memberships_user on public.memberships (user_id);

alter table public.memberships enable row level security;

create policy "Users can view their own membership"
  on public.memberships for select
  using (auth.uid() = user_id);

-- ============================================================
-- counselling_requests
-- ============================================================
create table if not exists public.counselling_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now(),
  counsellor_type text not null check (counsellor_type in ('relationship', 'marriage', 'religious')),
  status text not null default 'pending' -- 'pending' | 'contacted' | 'closed'
);

create index if not exists idx_counselling_requests_user on public.counselling_requests (user_id);

alter table public.counselling_requests enable row level security;

create policy "Users can view their own counselling requests"
  on public.counselling_requests for select
  using (auth.uid() = user_id);

create policy "Users can create their own counselling request"
  on public.counselling_requests for insert
  with check (auth.uid() = user_id);
