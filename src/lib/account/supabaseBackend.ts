import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Locale } from '../types';
import { isCompanyId, isTopicId, type CompanyId, type TopicId } from './catalog';
import { SESSION_STORAGE_KEY, type AccountConfig } from './config';
import { toAccountError } from './errors';
import { AccountError, type AccountBackend, type AccountUser, type Preferences, type Profile, type ProfilePatch, type SavedStory } from './types';

/**
 * Supabase implementation. Loaded with a dynamic import, so visitors who never sign in never
 * download the SDK. Only the publishable key is used; every table is protected by RLS.
 */

interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  locale: string;
  onboarding_step: number;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BookmarkRow {
  article_id: string;
  day: string;
  title: string;
  title_fa: string | null;
  source_name: string;
  url: string;
  published_at: string | null;
  created_at: string;
}

const PROFILE_COLUMNS = 'id, email, display_name, avatar_url, locale, onboarding_step, onboarding_completed_at, created_at, updated_at';
const BOOKMARK_COLUMNS = 'article_id, day, title, title_fa, source_name, url, published_at, created_at';

export function toUser(u: User): AccountUser {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    id: u.id,
    username: usernameFromInternalEmail(u.email ?? ''),
    provider: String(u.app_metadata?.provider ?? 'email'),
    lastSignInAt: u.last_sign_in_at ?? null,
    suggestedName: str(meta.full_name) ?? str(meta.name),
    suggestedAvatar: str(meta.avatar_url) ?? str(meta.picture),
  };
}

const USERNAME_DOMAIN = 'users.frontier.invalid';
/** Supabase password auth requires an email-shaped identifier. This alias is internal and never mailed or shown. */
export function internalEmailFor(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

export function usernameFromInternalEmail(email: string): string {
  const suffix = `@${USERNAME_DOMAIN}`;
  return email.toLowerCase().endsWith(suffix) ? email.slice(0, -suffix.length) : email.split('@')[0] ?? '';
}

export function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    locale: (r.locale === 'fa' ? 'fa' : 'en') as Locale,
    onboardingStep: r.onboarding_step,
    onboardingCompletedAt: r.onboarding_completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function toSaved(r: BookmarkRow): SavedStory {
  return {
    id: r.article_id,
    day: r.day,
    title: r.title,
    titleFa: r.title_fa ?? undefined,
    sourceName: r.source_name,
    url: r.url,
    publishedAt: r.published_at ?? '',
    savedAt: r.created_at,
  };
}

function toRow(s: SavedStory) {
  return {
    article_id: s.id,
    day: s.day,
    title: s.title.slice(0, 500),
    title_fa: s.titleFa ? s.titleFa.slice(0, 500) : null,
    source_name: s.sourceName.slice(0, 200),
    url: s.url,
    published_at: s.publishedAt || null,
  };
}

/** Unwraps a Supabase `{ data, error }` result, throwing the mapped error. */
function check<R extends { data: unknown; error: unknown }>(res: R): Exclude<R, { error: object }>['data'] {
  if (res.error) throw toAccountError(res.error);
  return res.data as Exclude<R, { error: object }>['data'];
}

export function createSupabaseBackend(cfg: AccountConfig, client?: SupabaseClient): AccountBackend {
  const sb =
    client ??
    createClient(cfg.url, cfg.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: SESSION_STORAGE_KEY,
      },
    });

  const requireUser = async (): Promise<User> => {
    const { data } = await sb.auth.getSession();
    if (!data.session) throw new AccountError('not_signed_in');
    return data.session.user;
  };

  return {
    kind: 'supabase',

    async currentUser() {
      let session: Session | null;
      try {
        session = check(await sb.auth.getSession()).session;
      } catch (err) {
        const e = toAccountError(err);
        if (e.kind === 'network') throw e;
        return null;
      }
      return session ? toUser(session.user) : null;
    },

    onChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        // Run outside the auth lock: callers may query the database straight away.
        window.setTimeout(() => {
          const user = session ? toUser(session.user) : null;
          if (event === 'SIGNED_OUT') cb(null, 'signed_out');
          else if (event === 'SIGNED_IN') cb(user, 'signed_in');
          else if (event === 'TOKEN_REFRESHED') cb(user, 'refreshed');
          else if (event === 'USER_UPDATED') cb(user, 'updated');
        }, 0);
      });
      return () => data.subscription.unsubscribe();
    },

    async signUp(username, password) {
      try {
        const data = check(await sb.auth.signUp({ email: internalEmailFor(username), password }));
        if (!data.user || !data.session) {
          // Username accounts have no mailbox, so email confirmation must be disabled in Supabase.
          throw new AccountError('method_disabled', 'Password signup requires email confirmation to be disabled.');
        }
        return toUser(data.user);
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async signIn(username, password) {
      try {
        const data = check(await sb.auth.signInWithPassword({ email: internalEmailFor(username), password }));
        if (!data.user) throw new AccountError('invalid_credentials');
        return toUser(data.user);
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async signOut(everywhere = false) {
      const { error } = await sb.auth.signOut({ scope: everywhere ? 'global' : 'local' });
      // A failed server call still clears the local session; only report network trouble for "everywhere".
      if (error && everywhere) throw toAccountError(error);
    },

    async getProfile() {
      const user = await requireUser();
      try {
        const found = check(await sb.from('profiles').select(PROFILE_COLUMNS).maybeSingle<ProfileRow>());
        if (found) return toProfile(found);
        // The sign-up trigger normally creates the row; create it here if it did not.
        const meta = toUser(user);
        const res = await sb
          .from('profiles')
          .insert({ display_name: meta.suggestedName?.slice(0, 60) ?? null })
          .select(PROFILE_COLUMNS)
          .single<ProfileRow>();
        if (res.error && (res.error as { code?: string }).code === '23505') {
          return toProfile(check(await sb.from('profiles').select(PROFILE_COLUMNS).single<ProfileRow>()));
        }
        return toProfile(check(res));
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async updateProfile(patch: ProfilePatch) {
      const user = await requireUser();
      const row: Record<string, unknown> = {};
      if (patch.displayName !== undefined) row.display_name = patch.displayName;
      if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
      if (patch.locale !== undefined) row.locale = patch.locale;
      if (patch.onboardingStep !== undefined) row.onboarding_step = patch.onboardingStep;
      if (patch.onboardingCompletedAt !== undefined) row.onboarding_completed_at = patch.onboardingCompletedAt;
      try {
        // RLS limits the update to the caller's row; the id filter only satisfies PostgREST's "no blind updates".
        const data = check(await sb.from('profiles').update(row).eq('id', user.id).select(PROFILE_COLUMNS).single<ProfileRow>());
        return toProfile(data);
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async getPreferences(): Promise<Preferences> {
      try {
        const [prefs, follows] = await Promise.all([
          sb.from('user_preferences').select('topics').maybeSingle<{ topics: string[] }>(),
          sb.from('user_followed_companies').select('company_id').order('created_at'),
        ]);
        const topics = (check(prefs)?.topics ?? []).filter(isTopicId);
        const companies = (check(follows) as { company_id: string }[]).map((r) => r.company_id).filter(isCompanyId);
        return { topics, companies };
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async saveTopics(topics: TopicId[]) {
      try {
        check(await sb.from('user_preferences').upsert({ topics: [...new Set(topics)] }, { onConflict: 'user_id' }));
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async saveCompanies(companies: CompanyId[]) {
      const next = [...new Set(companies)];
      try {
        const current = (check(await sb.from('user_followed_companies').select('company_id')) as { company_id: string }[]).map((r) => r.company_id);
        const drop = current.filter((c) => !next.includes(c as CompanyId));
        const add = next.filter((c) => !current.includes(c));
        if (drop.length) check(await sb.from('user_followed_companies').delete().in('company_id', drop));
        if (add.length) {
          check(
            await sb
              .from('user_followed_companies')
              .upsert(
                add.map((company_id) => ({ company_id })),
                { onConflict: 'user_id,company_id', ignoreDuplicates: true },
              ),
          );
        }
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async listSaved() {
      try {
        const rows = check(await sb.from('user_bookmarks').select(BOOKMARK_COLUMNS).order('created_at', { ascending: false }).limit(1000));
        return (rows as BookmarkRow[]).map(toSaved);
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async addSaved(items) {
      if (!items.length) return;
      try {
        check(await sb.from('user_bookmarks').upsert(items.map(toRow), { onConflict: 'user_id,article_id', ignoreDuplicates: true }));
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async removeSaved(articleId) {
      try {
        check(await sb.from('user_bookmarks').delete().eq('article_id', articleId));
      } catch (err) {
        throw toAccountError(err);
      }
    },

    async deleteAccount() {
      try {
        check(await sb.rpc('delete_my_account'));
      } catch (err) {
        throw toAccountError(err);
      }
      await sb.auth.signOut({ scope: 'local' });
    },
  };
}
