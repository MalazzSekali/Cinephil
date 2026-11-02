create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null,
  password_hash text not null,
  bio text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists user_sessions_expiry_idx on public.user_sessions(expires_at);
create table if not exists public.user_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  media_id text not null,
  category text not null check (category in ('movie','tv','anime','manga','manhwa')),
  title text not null,
  poster_url text,
  status text not null default 'plan' check (status in ('plan','current','completed','hold','dropped')),
  progress integer not null default 0 check(progress >= 0),
  progress_total integer check(progress_total is null or progress_total >= 0),
  rating numeric(3,1) check(rating is null or rating between 0 and 10),
  review text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, media_id, category)
);
create index if not exists user_collections_user_idx on public.user_collections(user_id, updated_at desc);
create table if not exists public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  title text not null,
  category text not null,
  created_at timestamptz not null default now()
);
create index if not exists user_activity_user_idx on public.user_activity(user_id, created_at desc);
create table if not exists public.login_attempts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  ip_address text not null,
  attempted_at timestamptz not null default now()
);
create index if not exists login_attempts_lookup_idx on public.login_attempts(username, ip_address, attempted_at desc);

create or replace function public.allow_login_attempt(p_username text, p_ip text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare recent_count integer;
begin
  delete from public.login_attempts where attempted_at < now() - interval '1 day';
  select count(*) into recent_count from public.login_attempts
    where username=p_username and ip_address=p_ip and attempted_at > now()-interval '15 minutes';
  if recent_count >= 10 then return false; end if;
  insert into public.login_attempts(username,ip_address) values (p_username,p_ip);
  return true;
end;
$$;
create or replace function public.clear_login_attempts(p_username text, p_ip text)
returns void language sql security definer set search_path = '' as $$
  delete from public.login_attempts where username=p_username and ip_address=p_ip;
$$;
revoke all on function public.allow_login_attempt(text,text) from public, anon, authenticated;
revoke all on function public.clear_login_attempts(text,text) from public, anon, authenticated;
grant execute on function public.allow_login_attempt(text,text) to service_role;
grant execute on function public.clear_login_attempts(text,text) to service_role;

alter table public.users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.user_collections enable row level security;
alter table public.user_activity enable row level security;
alter table public.login_attempts enable row level security;
revoke all on public.users, public.user_sessions, public.user_collections, public.user_activity, public.login_attempts from anon, authenticated;
