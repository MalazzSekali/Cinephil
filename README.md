# Cinephil

Cinephil is a dark, responsive entertainment tracker for movies, television, anime, manga, and manhwa. Search real title data, save titles to a private collection, track statuses and progress, and keep activity in one place.

## Stack
- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- Supabase PostgreSQL (server-side access only)
- TMDB for movies and TV; Jikan for anime and manga/manhwa
- Username/password accounts with bcrypt and random, revocable HttpOnly sessions

## Local setup
1. Create a Supabase project and run `supabase/migrations/202611020001_cinephil.sql` in its SQL editor.
2. Copy `.env.example` to `.env.local` and fill in the server-only Supabase URL and service role key, a TMDB API key, and a random `SESSION_SECRET` (at least 32 characters).
3. Install dependencies with `npm install`.
4. Run `npm run dev` and open http://localhost:3000.

The service role key must never use a `NEXT_PUBLIC_` name. Do not commit `.env.local`.

## Features
- Account registration and sign-in with username and password; no email or phone number.
- Password hashes use bcrypt (12 rounds). Sessions use random opaque tokens; only SHA-256 token hashes are stored in the database.
- Cookies are HttpOnly, SameSite=Lax, and Secure in production. Sessions expire after 30 days and logout revokes the server record.
- Login attempts are throttled in PostgreSQL by username and client IP (10 per 15 minutes).
- Search uses TMDB and Jikan responses. Search configuration errors never fall back to fabricated titles.
- Add, update status, increment progress, and remove personal collection entries.
- User tables have RLS enabled and no anon/authenticated grants. All data access is through server routes using the server-only service key and an explicit user ID condition.

## Environment variables
| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |
| `SUPABASE_URL` | Supabase project endpoint (server use) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access |
| `TMDB_API_KEY` | TMDB v3 API key (server use) |
| `SESSION_SECRET` | Reserved for signing/rotation integrations; set to a high-entropy value |

## Deployment
Import this GitHub repository into Vercel, set the environment variables above for Production and Preview, then deploy. Apply the SQL migration to the matching Supabase project before enabling account registration. Automatic deployments are available after the Git repository is connected in Vercel.

## API routes
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/search?q=...&type=all|movie|tv|anime|manga|manhwa`
- `GET|POST|PATCH|DELETE /api/collection`

## Scope notes
The initial app supports private collections, per-title status, progress increments, ratings/reviews fields in the API/database, and activity events. Password change, editable public profiles, favorites management, pagination, and a dedicated title-detail page are follow-up work. TMDB API access requires a key; Jikan is public and rate-limited upstream.
