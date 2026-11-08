alter table public.user_collections
  drop constraint if exists user_collections_category_check;

alter table public.user_collections
  add constraint user_collections_category_check
  check (category in ('movie', 'tv', 'cartoon', 'anime', 'manga', 'manhwa', 'book', 'novel'));
