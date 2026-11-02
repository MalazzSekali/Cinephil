alter table public.user_collections
  add column if not exists season_count integer
  check (season_count is null or season_count >= 0);
