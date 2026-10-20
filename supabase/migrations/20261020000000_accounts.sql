-- SIGNAL AI accounts: profiles, interests, followed companies and cloud bookmarks.
--
-- Run once on a Supabase project (SQL editor, or `supabase db push`). See docs/AUTH-SETUP.md.
-- Every user table has Row Level Security; the browser only ever holds the publishable key,
-- so these policies are the whole access-control story. News itself is static JSON on GitHub
-- Pages and never lives in this database.
--
-- Keep the topic and company ids in sync with src/lib/account/catalog.ts.

-- Helpers that must not be callable through the REST API live outside the exposed `public` schema.
create schema if not exists signal_private;
revoke all on schema signal_private from public;

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  -- Copied from auth.users by trigger; clients cannot write it.
  email text,
  display_name text check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  avatar_url text check (
    avatar_url is null
    or (char_length(avatar_url) <= 500 and avatar_url ~* '^https://[^[:space:]<>"''`]+$')
  ),
  locale text not null default 'en' check (locale in ('en', 'fa')),
  -- Last onboarding step the user finished (0 = not started). Lets onboarding resume after a reload.
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 4),
  -- Set only once preferences and follows were saved successfully.
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per Supabase Auth user. Private to its owner (RLS).';

-- Server-owned columns: email always comes from auth.users, timestamps from the clock, id never changes.
create function signal_private.profiles_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := (select u.email from auth.users u where u.id = new.id);
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before insert or update on public.profiles
for each row execute function signal_private.profiles_guard();

-- ---------------------------------------------------------------- preferences
create table public.user_preferences (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  topics text[] not null default '{}' check (
    cardinality(topics) <= 10
    and topics <@ array[
      'models', 'tools', 'research', 'open-source', 'agents',
      'business', 'hardware', 'policy-safety', 'design', 'coding'
    ]::text[]
  ),
  updated_at timestamptz not null default now()
);

comment on table public.user_preferences is 'Selected news topics. Stores preferences only, never copies of news.';

create function signal_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_preferences_touch before insert or update on public.user_preferences
for each row execute function signal_private.touch_updated_at();

-- ---------------------------------------------------------------- followed companies
create table public.user_followed_companies (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  company_id text not null check (
    company_id in (
      'anthropic', 'openai', 'google', 'meta', 'nvidia', 'microsoft', 'huggingface',
      'amazon', 'apple', 'mistral', 'xai', 'deepseek', 'alibaba'
    )
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

comment on table public.user_followed_companies is 'Companies and platforms a user follows (one row each).';

-- ---------------------------------------------------------------- bookmarks
create table public.user_bookmarks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  article_id text not null check (article_id ~ '^[a-f0-9]{6,40}$'),
  -- A small attribution snapshot so a saved story still renders after it leaves the archive.
  day date not null,
  title text not null check (char_length(title) between 1 and 500),
  title_fa text check (title_fa is null or char_length(title_fa) between 1 and 500),
  source_name text not null check (char_length(source_name) between 1 and 200),
  url text not null check (char_length(url) <= 2000 and url ~* '^https?://'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, article_id)
);

create index user_bookmarks_user_created on public.user_bookmarks (user_id, created_at desc);

comment on table public.user_bookmarks is 'Saved stories. One row per (user, article); duplicates are rejected.';

-- Anti-abuse: cap rows per user so one account cannot grow the database without bound.
-- Runs as the caller, so the count only ever sees the caller's own rows (RLS).
create function signal_private.cap_rows() returns trigger
language plpgsql set search_path = '' as $$
declare
  n integer;
  cap integer := tg_argv[0]::integer;
begin
  execute format('select count(*) from %I.%I where user_id = $1', tg_table_schema, tg_table_name) into n using new.user_id;
  if n >= cap then
    raise exception 'row limit reached for %', tg_table_name using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger user_bookmarks_cap before insert on public.user_bookmarks
for each row execute function signal_private.cap_rows('1000');

-- ---------------------------------------------------------------- new users
-- Creates the profile and preference rows when Supabase Auth creates a user. It never blocks a
-- sign-up: if anything here fails, the app creates the rows itself on first sign-in.
create function signal_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := nullif(left(btrim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), 60), '');
  avatar text := meta ->> 'avatar_url';
begin
  if avatar is null or char_length(avatar) > 500 or avatar !~* '^https://[^[:space:]<>"''`]+$' then
    avatar := null;
  end if;
  begin
    insert into public.profiles (id, display_name, avatar_url) values (new.id, name, avatar)
    on conflict (id) do nothing;
    insert into public.user_preferences (user_id) values (new.id)
    on conflict (user_id) do nothing;
  exception when others then
    raise warning 'signal_private.handle_new_user: %', sqlerrm;
  end;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function signal_private.handle_new_user();

-- Keep the profile email in step when a user changes it in Supabase Auth.
create function signal_private.sync_user_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
exception when others then
  raise warning 'signal_private.sync_user_email: %', sqlerrm;
  return new;
end;
$$;

create trigger on_auth_user_email_changed after update of email on auth.users
for each row execute function signal_private.sync_user_email();

-- ---------------------------------------------------------------- account deletion
-- Deletes the caller's own auth user; every table above cascades from auth.users.
-- The id comes from the verified JWT (auth.uid()), never from an argument.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------- privileges
-- Nothing for anonymous visitors. Signed-in users get only the operations the app needs,
-- and RLS below narrows every one of them to the caller's own rows.
revoke all on public.profiles, public.user_preferences, public.user_followed_companies, public.user_bookmarks
  from anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant update (display_name, avatar_url, locale, onboarding_step, onboarding_completed_at) on public.profiles to authenticated;
grant select, insert on public.user_preferences to authenticated;
grant update (topics) on public.user_preferences to authenticated;
grant select, insert, delete on public.user_followed_companies to authenticated;
grant select, insert, delete on public.user_bookmarks to authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_followed_companies enable row level security;
alter table public.user_bookmarks enable row level security;

-- `(select auth.uid())` is evaluated once per statement instead of once per row.
create policy "profiles: owner reads" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: owner creates" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles: owner updates" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "preferences: owner reads" on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy "preferences: owner creates" on public.user_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "preferences: owner updates" on public.user_preferences
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "follows: owner reads" on public.user_followed_companies
  for select to authenticated using (user_id = (select auth.uid()));
create policy "follows: owner adds" on public.user_followed_companies
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "follows: owner removes" on public.user_followed_companies
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "bookmarks: owner reads" on public.user_bookmarks
  for select to authenticated using (user_id = (select auth.uid()));
create policy "bookmarks: owner adds" on public.user_bookmarks
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "bookmarks: owner removes" on public.user_bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));
