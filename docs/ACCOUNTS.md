# Accounts, personalization and cloud bookmarks

Optional accounts on top of the static site. Public news, search, archive, picks and browser-only
bookmarks keep working for everyone, signed in or not. Setup steps: [AUTH-SETUP.md](AUTH-SETUP.md).

## How it fits the static site

```
GitHub Pages (static React app, hash routes)
   │  publishable key only, loaded on demand
   ▼
Supabase Auth (username/password through internal non-mail aliases, sessions, refresh)
Supabase Postgres (profiles, preferences, follows, bookmarks; RLS on every table)
```

- The SDK (`@supabase/supabase-js`) is a separate chunk. It is fetched only when the browser holds a
  session or the reader opens **Sign in**. Visitors without an account download nothing extra.
- Build variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  come from GitHub Actions **variables** (`deploy.yml`). Without them the account screens explain
  that accounts are not set up. A secret or `service_role` key fails the build.
- The production CSP allows `connect-src` to the configured Supabase origin only.
- The mock build (`npm run build:mock`) uses a labelled in-browser service (`mockBackend.ts`) so
  unit and e2e tests never need a network. It is compiled out of
  production builds.

| Route | Screen | Needs account |
| --- | --- | --- |
| `#/signin` (`?mode=create`, `?next=/saved`) | username + password | no |
| `#/welcome` | onboarding: name + language, topics, companies, review | yes |
| `#/for-you` | personal dashboard | yes |
| `#/account` | profile, interests, follows, saved count, privacy, sign out, delete | yes |
| `#/saved` | account bookmarks when signed in, browser bookmarks otherwise | no |
| `#/privacy` | what is stored and why | no |

Code: `src/lib/account/` (config, Supabase and mock services, provider, catalog, ranking, saved
stories), `src/components/account/`, `src/pages/account/`, `src/styles/account.css`.

## Sign-in flow

1. Readers choose a lowercase username (3–24 characters) and a password of at least 8 characters.
2. The app turns the username into a fixed internal `@users.frontier.invalid` alias because
   Supabase password auth requires an email-shaped identifier. The alias is never shown or mailed.
3. Registration uses `signUp`; returning readers use `signInWithPassword`. Supabase hashes and
   verifies passwords—the application database and browser never receive the stored password.
4. The profile row is read (created by a database trigger, or by the app if the trigger did not).
   New accounts go to onboarding; finished ones go to `next` or For You.
5. Sessions persist in `localStorage` (`signal-ai:auth`) and refresh automatically. While a stored
   session restores, the header shows a neutral placeholder rather than flashing "Sign in". If a
   session ends by itself (refresh token expired or revoked), a notice says so.
6. No real email address is collected, so there is no email-based password recovery. The UI says
   this clearly and asks readers to keep their credentials safe.

## Database

Migration: `supabase/migrations/20261020000000_accounts.sql`.

| Table | Key | Notes |
| --- | --- | --- |
| `profiles` | `id` → `auth.users` (cascade) | internal auth alias (read-only), `display_name` ≤ 60, `avatar_url` https only ≤ 500, `locale` en/fa, `onboarding_step` 0–4, `onboarding_completed_at`, `created_at`, `updated_at` |
| `user_preferences` | `user_id` → `auth.users` | `topics text[]` limited to the ten known topic ids |
| `user_followed_companies` | (`user_id`, `company_id`) | one row per followed company, ids checked |
| `user_bookmarks` | identity; unique (`user_id`, `article_id`) | attribution snapshot (title, source, link, date) so saved stories survive archive changes; max 1,000 per user |

- `user_id` / `id` default to `auth.uid()`; the app never sends a user id.
- Clients get only the privileges they use (e.g. `update` on five profile columns, no `update` on
  bookmarks); `anon` gets nothing.
- `public.delete_my_account()` (security definer) deletes `auth.users` where `id = auth.uid()`;
  everything cascades.
- Password hashes and session secrets exist only inside Supabase Auth.

## Personal ranking

`src/lib/account/personalize.ts`, deterministic and explained in the UI:

```
personal = 0.5 × public signal score (0–100; 40 if missing)
         + 18 if the story matches one of the reader's topics
         + 24 if it mentions a followed company (+8 when it is that company's model release)
         + 15 × 0.5^(age hours / 24)
         + 3 per extra source covering the same event (max 9)
ties → newer first → id
```

Topics map onto the collector's categories (`models`, `products`, `research`, …) and, for
cross-cutting topics (Robotics & Agents, AI in Design & Architecture, AI Coding Assistants), title
and excerpt keywords. Companies match the collector's `entities` and brand ids. With no preferences
every personal part is zero, which is the normal global order. The function returns new arrays and
never changes articles or public scores, so one reader's choices cannot affect anyone else.

## Bookmarks

- Signed out: `localStorage` only, as before.
- Signed in: account bookmarks with optimistic toggling (rolled back with a notice if the database
  refuses). Duplicates are impossible (unique index + `on conflict do nothing`).
- After sign-in, if this browser has bookmarks the account lacks, the reader is offered **Add to my
  account** or **Not now**. Nothing is copied or deleted without that click; local bookmarks stay in
  the browser either way and are listed separately on the Saved page.

## Security verification

Automated (runs in CI, no network): `src/lib/account/rls.test.ts` loads the real migration into an
in-process Postgres (PGlite) with a stub of Supabase's `auth` schema and checks, as two different
signed-in users and as an anonymous visitor, that each user sees and changes only their own rows,
cannot write rows in another user's name, cannot change `email`/`id`, that invalid topics, companies
and URLs are rejected, duplicates are rejected, and `delete_my_account()` removes only the caller.

Manual, on the real project (after AUTH-SETUP step 2), in **SQL Editor**:

```sql
-- 1. RLS is on for every user table (expect four rows, all true).
select relname, relrowsecurity from pg_class
where relname in ('profiles','user_preferences','user_followed_companies','user_bookmarks');

-- 2. Policies exist for exactly the operations the app uses.
select tablename, policyname, cmd, roles from pg_policies where schemaname = 'public' order by 1, 3;

-- 3. Anonymous visitors have no table privileges (expect zero rows).
select table_name, privilege_type from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
  and table_name in ('profiles','user_preferences','user_followed_companies','user_bookmarks');

-- 4. Impersonate user A and try to read user B (replace the UUIDs from Authentication → Users).
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<USER-A-UUID>","role":"authenticated"}', true);
select count(*) from public.user_bookmarks where user_id = '<USER-B-UUID>';   -- expect 0
update public.profiles set display_name = 'x' where id = '<USER-B-UUID>';     -- expect UPDATE 0
insert into public.user_bookmarks (user_id, article_id, day, title, source_name, url)
  values ('<USER-B-UUID>', 'abcdef12', '2026-10-20', 't', 's', 'https://x.test'); -- expect RLS error
rollback;
```

Then with two real accounts in two browsers: save different stories, follow different companies,
and confirm neither account ever shows the other's data. Finally check the built bundle holds no
secret key: `node scripts/check-bundle-keys.mjs dist` (the deploy workflow runs it on every
build). It looks for real `sb_secret_…` keys and JWTs whose role is `service_role`; the bare words
appear in the bundle on purpose, as part of the guard that refuses such keys.

## Privacy

What is stored, what never is, and the reader's controls are written out on `#/privacy` in both
languages. No analytics, tracking or ad scripts. The site does not collect an email address.
