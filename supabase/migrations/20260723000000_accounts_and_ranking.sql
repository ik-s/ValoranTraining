-- Google-authenticated profiles, private raw runs, and a deliberately limited
-- public leaderboard. Apply through the Supabase migration tool, not the browser.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 3 and 32),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "profiles are readable by their owner"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles can update their own display name"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    '훈련생-' || upper(substr(replace(new.id::text, '-', ''), 1, 6))
  );
  return new;
end;
$$;

-- This function exists only for the auth.users trigger. It must never be
-- callable over the public PostgREST RPC endpoint.
revoke all on function public.create_profile_for_new_user() from public;
revoke all on function public.create_profile_for_new_user() from anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create table public.training_runs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mode_id text not null check (
    mode_id in (
      'grid-shot',
      'micro-flick',
      'reaction-shot',
      'target-switching',
      'strafe-track',
      'headshot-only'
    )
  ),
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  duration_seconds integer not null check (duration_seconds in (30, 60)),
  score double precision not null check (score >= 0 and score <= 10000000),
  accuracy double precision check (
    accuracy is null or (accuracy >= 0 and accuracy <= 1)
  ),
  completed_at timestamptz not null,
  result_data jsonb not null check (
    jsonb_typeof(result_data) = 'object'
    and result_data ->> 'id' = id::text
    and result_data ->> 'modeId' = mode_id
    and result_data ->> 'difficulty' = difficulty
  ),
  created_at timestamptz not null default now()
);

create index training_runs_leaderboard_lookup_idx
  on public.training_runs (
    mode_id,
    difficulty,
    duration_seconds,
    score desc,
    completed_at asc
  );

create index training_runs_owner_lookup_idx
  on public.training_runs (user_id, completed_at desc);

alter table public.training_runs enable row level security;

revoke all on table public.training_runs from anon, authenticated;
grant select, insert on table public.training_runs to authenticated;

create policy "users can read their own raw training runs"
  on public.training_runs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can insert only their own training runs"
  on public.training_runs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create function public.get_leaderboard(
  p_mode_id text,
  p_difficulty text,
  p_duration_seconds integer
)
returns table (
  rank bigint,
  display_name text,
  score double precision,
  accuracy double precision,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with best_run_per_player as (
    select distinct on (run.user_id)
      run.user_id,
      run.score,
      run.accuracy,
      run.completed_at
    from public.training_runs as run
    where run.mode_id = p_mode_id
      and run.difficulty = p_difficulty
      and run.duration_seconds = p_duration_seconds
    order by run.user_id, run.score desc, run.completed_at asc
  )
  select
    row_number() over (order by best.score desc, best.completed_at asc)::bigint,
    profile.display_name,
    best.score,
    best.accuracy,
    best.completed_at
  from best_run_per_player as best
  join public.profiles as profile on profile.id = best.user_id
  order by best.score desc, best.completed_at asc
  limit 100;
$$;

revoke all on function public.get_leaderboard(text, text, integer) from public;
grant execute on function public.get_leaderboard(text, text, integer)
  to anon, authenticated;
