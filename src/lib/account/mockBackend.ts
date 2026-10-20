import type { Locale } from '../types';
import type { CompanyId, TopicId } from './catalog';
import { CODE_LENGTH, MOCK_CODE, MOCK_SESSION_KEY } from './config';
import { AccountError, type AccountBackend, type AccountUser, type AuthChangeReason, type Preferences, type Profile, type SavedStory } from './types';

/**
 * In-browser stand-in for Supabase, used only by the clearly labelled mock build and by tests.
 * No email is sent: the code is always MOCK_CODE. Data lives in localStorage on this device.
 * Test hooks: an address containing "ratelimit" is rate limited, one containing "offline" fails
 * like a dropped connection, and "blocked" behaves like the default Supabase mailer refusing it.
 */
export { MOCK_CODE };
const DB_KEY = 'signal-ai:mock-accounts:v1';
const SESSION_KEY = MOCK_SESSION_KEY;

interface MockUserRecord {
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

function idFor(email: string): string {
  let h = 0;
  for (const ch of email) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return `00000000-0000-4000-8000-${h.toString(16).padStart(12, '0').slice(-12)}`;
}

export interface MockOptions {
  /** Artificial latency in ms (0 in unit tests). */
  latency?: number;
  googleEnabled?: boolean;
  now?: () => Date;
}

export function createMockBackend(opts: MockOptions = {}): AccountBackend {
  const latency = opts.latency ?? 0;
  const now = opts.now ?? (() => new Date());
  const listeners = new Set<(u: AccountUser | null, r: AuthChangeReason) => void>();
  const pending = new Map<string, number>();

  const db = (): MockDb => load<MockDb>(DB_KEY, {});
  const session = (): string | null => load<string | null>(SESSION_KEY, null);
  const emit = (u: AccountUser | null, r: AuthChangeReason) => listeners.forEach((l) => l(u, r));

  const me = (): MockUserRecord => {
    const email = session();
    const rec = email ? db()[email] : undefined;
    if (!rec) throw new AccountError('not_signed_in');
    return rec;
  };
  const save = (rec: MockUserRecord) => {
    const all = db();
    all[rec.user.email] = rec;
    store(DB_KEY, all);
  };

  return {
    kind: 'mock',
    googleEnabled: opts.googleEnabled ?? false,

    async currentUser() {
      await sleep(latency);
      const email = session();
      return (email && db()[email]?.user) || null;
    },

    onChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },

    async requestCode(email) {
      await sleep(latency);
      if (email.includes('offline')) throw new AccountError('network');
      if (email.includes('ratelimit')) throw new AccountError('rate_limited');
      if (email.includes('blocked')) throw new AccountError('delivery_restricted');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountError('invalid_email');
      pending.set(email, now().getTime());
    },

    async verifyCode(email, code) {
      await sleep(latency);
      if (email.includes('offline')) throw new AccountError('network');
      if (!pending.has(email) || code.length !== CODE_LENGTH || code !== MOCK_CODE) throw new AccountError('invalid_code');
      pending.delete(email);
      const all = db();
      const at = now().toISOString();
      const rec: MockUserRecord = all[email] ?? {
        user: { id: idFor(email), email, emailVerified: true, provider: 'email', lastSignInAt: at, suggestedName: null, suggestedAvatar: null },
        profile: {
          id: idFor(email),
          email,
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
      rec.user = { ...rec.user, lastSignInAt: at };
      save(rec);
      store(SESSION_KEY, email);
      emit(rec.user, 'signed_in');
      return rec.user;
    },

    async signInWithGoogle() {
      throw new AccountError('method_disabled');
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
      delete all[rec.user.email];
      store(DB_KEY, all);
      store(SESSION_KEY, null);
      emit(null, 'signed_out');
    },
  };
}
