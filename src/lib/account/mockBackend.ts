import type { Locale } from '../types';
import type { CompanyId, TopicId } from './catalog';
import { MOCK_SESSION_KEY } from './config';
import { AccountError, type AccountBackend, type AccountUser, type AuthChangeReason, type Preferences, type Profile, type SavedStory } from './types';

/**
 * In-browser stand-in for Supabase, used only by the clearly labelled mock build and by tests.
 * Data lives in localStorage on this device. Passwords here exist only in the labelled mock build;
 * production credentials are handled and hashed by Supabase Auth.
 */
const DB_KEY = 'signal-ai:mock-accounts:v1';
const SESSION_KEY = MOCK_SESSION_KEY;

interface MockUserRecord {
  password: string;
  user: AccountUser;
  profile: Profile;
  prefs: Preferences;
  saved: SavedStory[];
}

type MockDb = Record<string, MockUserRecord>;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function store(key: string, value: unknown) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode: the mock lasts for this visit */
  }
}

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

function idFor(username: string): string {
  let h = 0;
  for (const ch of username) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return `00000000-0000-4000-8000-${h.toString(16).padStart(12, '0').slice(-12)}`;
}

export interface MockOptions {
  /** Artificial latency in ms (0 in unit tests). */
  latency?: number;
  now?: () => Date;
}

export function createMockBackend(opts: MockOptions = {}): AccountBackend {
  const latency = opts.latency ?? 0;
  const now = opts.now ?? (() => new Date());
  const listeners = new Set<(u: AccountUser | null, r: AuthChangeReason) => void>();
  const db = (): MockDb => load<MockDb>(DB_KEY, {});
  const session = (): string | null => load<string | null>(SESSION_KEY, null);
  const emit = (u: AccountUser | null, r: AuthChangeReason) => listeners.forEach((l) => l(u, r));

  const me = (): MockUserRecord => {
    const username = session();
    const rec = username ? db()[username] : undefined;
    if (!rec) throw new AccountError('not_signed_in');
    return rec;
  };
  const save = (rec: MockUserRecord) => {
    const all = db();
    all[rec.user.username] = rec;
    store(DB_KEY, all);
  };

  return {
    kind: 'mock',

    async currentUser() {
      await sleep(latency);
      const username = session();
      return (username && db()[username]?.user) || null;
    },

    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async signUp(username, password) {
      await sleep(latency);
      if (username.includes('offline')) throw new AccountError('network');
      if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username)) throw new AccountError('invalid_username');
      if (password.length < 8) throw new AccountError('invalid_password');
      const all = db();
      if (all[username]) throw new AccountError('username_taken');
      const at = now().toISOString();
      const rec: MockUserRecord = {
        password,
        user: { id: idFor(username), username, provider: 'email', lastSignInAt: at, suggestedName: null, suggestedAvatar: null },
        profile: {
          id: idFor(username),
          email: null,
          displayName: null,
          avatarUrl: null,
          locale: 'en' as Locale,
          onboardingStep: 0,
          onboardingCompletedAt: null,
          createdAt: at,
          updatedAt: at,
        },
        prefs: { topics: [], companies: [] },
        saved: [],
      };
      save(rec);
      store(SESSION_KEY, username);
      emit(rec.user, 'signed_in');
      return rec.user;
    },

    async signIn(username, password) {
      await sleep(latency);
      if (username.includes('offline')) throw new AccountError('network');
      const rec = db()[username];
      if (!rec || rec.password !== password) throw new AccountError('invalid_credentials');
      rec.user = { ...rec.user, lastSignInAt: now().toISOString() };
      save(rec);
      store(SESSION_KEY, username);
      emit(rec.user, 'signed_in');
      return rec.user;
    },

    async signOut() {
      await sleep(latency);
      store(SESSION_KEY, null);
      emit(null, 'signed_out');
    },

    async getProfile() {
      await sleep(latency);
      return me().profile;
    },

    async updateProfile(patch) {
      await sleep(latency);
      const rec = me();
      if (patch.displayName !== undefined && patch.displayName !== null && !patch.displayName.trim()) throw new AccountError('unknown', 'display name');
      if (patch.avatarUrl && !/^https:\/\//i.test(patch.avatarUrl)) throw new AccountError('unknown', 'avatar url');
      rec.profile = {
        ...rec.profile,
        ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
        updatedAt: now().toISOString(),
      };
      save(rec);
      return rec.profile;
    },

    async getPreferences() {
      await sleep(latency);
      return { ...me().prefs };
    },

    async saveTopics(topics: TopicId[]) {
      await sleep(latency);
      const rec = me();
      rec.prefs = { ...rec.prefs, topics: [...new Set(topics)] };
      save(rec);
    },

    async saveCompanies(companies: CompanyId[]) {
      await sleep(latency);
      const rec = me();
      rec.prefs = { ...rec.prefs, companies: [...new Set(companies)] };
      save(rec);
    },

    async listSaved() {
      await sleep(latency);
      return [...me().saved].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    },

    async addSaved(items) {
      await sleep(latency);
      const rec = me();
      const have = new Set(rec.saved.map((s) => s.id));
      const at = now().toISOString();
      for (const it of items) {
        if (have.has(it.id)) continue;
        have.add(it.id);
        rec.saved.push({ ...it, savedAt: at });
      }
      save(rec);
    },

    async removeSaved(articleId) {
      await sleep(latency);
      const rec = me();
      rec.saved = rec.saved.filter((s) => s.id !== articleId);
      save(rec);
    },

    async deleteAccount() {
      await sleep(latency);
      const rec = me();
      const all = db();
      delete all[rec.user.username];
      store(DB_KEY, all);
      store(SESSION_KEY, null);
      emit(null, 'signed_out');
    },
  };
}
