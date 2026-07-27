-- Run this in the Supabase SQL editor after creating your project.
-- Reflects the MarryMe.sg matching mechanic: see
-- marryme-sg-concept-and-features.md for the full spec.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  age int,
  gender text,
  community text,          -- e.g. Chinese, Malay, Indian, Eurasian, Other
  occupation text,
  bio text,
  photo_url text,
  role text default 'member',      -- 'member' or 'admin'
  status text default 'pending',   -- 'pending', 'approved', 'suspended'

  -- Relationship state machine — a member is in exactly one of these
  -- at a time, which drives whether they're eligible for a new set
  -- of 5 matches.
  relationship_status text default 'seeking',
  -- 'seeking'      -> eligible to receive/choose from a match set
  -- 'talking'       -> actively pursuing one chosen match (Section 4: one at a time)
  -- 'cooling_off'   -> broke up, in the 2-week window (Section 5)
  -- 'engaged'       -> chose to marry, eligible for counselling (Section 6)
  -- 'married'       -> eligible for the free wedding photoshoot (Section 7)
  cooling_off_until timestamptz,

  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view approved profiles"
  on public.profiles for select
  using (status = 'approved' or auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Personality test responses (Section 3). Raw answers stored as JSON;
-- the matching job reads these to assemble each week's set of 5.
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

-- One row per weekly release of 5 matches for a given member
-- (Section 2.1). A new row is only created once a week, and only
-- if the member is currently 'seeking'.
create table if not exists public.match_sets (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles(id) on delete cascade,
  week_starting date not null,
  created_at timestamptz default now(),
  unique (member_id, week_starting)
);

alter table public.match_sets enable row level security;

create policy "Users can view their own match sets"
  on public.match_sets for select
  using (auth.uid() = member_id);

-- The 5 candidate profiles inside a given match_set.
create table if not exists public.match_set_candidates (
  id uuid primary key default gen_random_uuid(),
  match_set_id uuid references public.match_sets(id) on delete cascade,
  candidate_profile_id uuid references public.profiles(id) on delete cascade,
  -- 'available'   -> candidate not yet spoken for
  -- 'unavailable' -> candidate is currently 'talking' with someone else
  -- 'chosen'      -> this member chose this candidate (Section 2.3)
  status text default 'available'
);

alter table public.match_set_candidates enable row level security;

create policy "Users can view candidates in their own match sets"
  on public.match_set_candidates for select
  using (
    exists (
      select 1 from public.match_sets
      where match_sets.id = match_set_candidates.match_set_id
      and match_sets.member_id = auth.uid()
    )
  );

-- Waitlist / queuing rule from Section 2.3: if member A chooses
-- candidate B while B is unavailable, this records A's interest so
-- B can be offered to A first if B becomes free again. Ordered
-- first-come-first-served by created_at (open question from the
-- spec — FIFO is the simplest default).
create table if not exists public.match_waitlist (
  id uuid primary key default gen_random_uuid(),
  interested_profile_id uuid references public.profiles(id) on delete cascade,
  target_profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  -- 'waiting' -> still queued
  -- 'offered' -> target became available, this person was notified
  -- 'expired' -> offer window passed without a response
  -- 'matched' -> resulted in an actual match
  status text default 'waiting'
);

alter table public.match_waitlist enable row level security;

create policy "Users can view their own waitlist entries"
  on public.match_waitlist for select
  using (auth.uid() = interested_profile_id);

-- An active or past pairing between two members.
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  member_a_id uuid references public.profiles(id) on delete cascade,
  member_b_id uuid references public.profiles(id) on delete cascade,
  -- 'talking' -> Section 4, one active match at a time
  -- 'cooling_off' -> Section 5, 2-week window after a breakup
  -- 'reconciled' -> patched up during cooling-off
  -- 'ended' -> cooling-off passed, both released to a new match set
  -- 'engaged' / 'married' -> Sections 6 & 7
  status text default 'talking',
  cooling_off_until timestamptz,
  created_at timestamptz default now()
);

alter table public.matches enable row level security;

create policy "Users can view their own matches"
  on public.matches for select
  using (auth.uid() = member_a_id or auth.uid() = member_b_id);

-- Messages within a match (Section 2.2 — messaging stays open with
-- all 5 candidates during the week, then narrows to the one match).
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can view messages in their own matches"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches
      where matches.id = messages.match_id
      and (matches.member_a_id = auth.uid() or matches.member_b_id = auth.uid())
    )
  );

create policy "Users can send messages in their own matches"
  on public.messages for insert
  with check (auth.uid() = sender_id);

-- Pre-marriage counselling requests (Section 6).
create table if not exists public.counselling_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete cascade,
  status text default 'requested', -- 'requested', 'scheduled', 'completed'
  created_at timestamptz default now()
);

alter table public.counselling_requests enable row level security;

create policy "Users can view counselling requests for their own matches"
  on public.counselling_requests for select
  using (
    exists (
      select 1 from public.matches
      where matches.id = counselling_requests.match_id
      and (matches.member_a_id = auth.uid() or matches.member_b_id = auth.uid())
    )
  );

-- Free wedding photoshoot claims (Section 7).
create table if not exists public.wedding_perk_claims (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references public.matches(id) on delete cascade,
  claimed_by uuid references public.profiles(id) on delete cascade,
  status text default 'claimed', -- 'claimed', 'scheduled', 'delivered'
  created_at timestamptz default now()
);

alter table public.wedding_perk_claims enable row level security;

create policy "Users can view wedding perk claims for their own matches"
  on public.wedding_perk_claims for select
  using (
    exists (
      select 1 from public.matches
      where matches.id = wedding_perk_claims.match_id
      and (matches.member_a_id = auth.uid() or matches.member_b_id = auth.uid())
    )
  );
