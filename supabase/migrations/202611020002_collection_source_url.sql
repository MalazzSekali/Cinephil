alter table public.user_collections
  add column if not exists source_url text;

alter table public.user_collections
  add constraint user_collections_source_url_http_check
  check (source_url is null or source_url ~* '^https?://');
