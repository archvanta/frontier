import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { snapshotOf } from '../bookmarks';
import { useI18n } from '../i18n';
import type { Article } from '../types';
import type { CompanyId, TopicId } from './catalog';
import { ACCOUNT_CONFIG, mayHaveSession, type AccountConfig, type AccountMode } from './config';
import { toAccountError } from './errors';
import type { AccountMessageKey } from './messages';
import { AccountError, type AccountBackend, type AccountUser, type Preferences, type Profile, type ProfilePatch, type SavedStory } from './types';

/**
 * Account state for the whole app. The public site never waits on it: when accounts are off, or
 * the browser holds no session, nothing is loaded at all. The SDK is fetched the first time a
 * session needs restoring or someone opens the sign-in screen.
 */
export type AccountStatus = 'off' | 'restoring' | 'signed-out' | 'signed-in';

export interface AccountToast {
  key: AccountMessageKey;
  tone: 'info' | 'error';
  id: number;
}

export interface AccountValue {
  mode: AccountMode;
  config: AccountConfig;
  status: AccountStatus;
  user: AccountUser | null;
  profile: Profile | null;
  /** Profile/preferences loading state once signed in. */
  dataStatus: 'idle' | 'loading' | 'ready' | 'error';
  prefs: Preferences | null;
  saved: SavedStory[] | null;
  toast: AccountToast | null;
  /** Loads the account service early (sign-in screen) so the first click is instant. */
  prepare(): void;
  signUp(username: string, password: string, next?: string): Promise<string>;
  signIn(username: string, password: string, next?: string): Promise<string>;
  signOut(everywhere?: boolean): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  saveTopics(topics: TopicId[]): Promise<void>;
  saveCompanies(companies: CompanyId[]): Promise<void>;
  toggleSaved(a: Article): Promise<void>;
  removeSaved(id: string): Promise<void>;
  addSaved(items: SavedStory[]): Promise<void>;
  deleteAccount(): Promise<void>;
  reload(): void;
  showToast(key: AccountMessageKey, tone?: 'info' | 'error'): void;
  dismissToast(): void;
}

const notConfigured = () => Promise.reject(new AccountError('not_configured'));

const OFF_VALUE: AccountValue = {
  mode: 'off',
  config: { mode: 'off', url: '', key: '', problems: [] },
  status: 'off',
  user: null,
  profile: null,
  dataStatus: 'idle',
  prefs: null,
  saved: null,
  toast: null,
  prepare: () => {},
  signUp: notConfigured,
  signIn: notConfigured,
  signOut: notConfigured,
  updateProfile: notConfigured,
  saveTopics: notConfigured,
  saveCompanies: notConfigured,
  toggleSaved: notConfigured,
  removeSaved: notConfigured,
  addSaved: notConfigured,
  deleteAccount: notConfigured,
  reload: () => {},
  showToast: () => {},
  dismissToast: () => {},
};

const AccountContext = createContext<AccountValue>(OFF_VALUE);

/** Profile language is applied once per browser session, so the header switch keeps working after that. */
const LOCALE_APPLIED_KEY = 'signal-ai:profile-locale-applied';

function session(key: string, value?: string | null): string | null {
  try {
    if (value === undefined) return window.sessionStorage.getItem(key);
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    /* storage blocked */
  }
  return null;
}

/** Only in-app hash paths are accepted as a destination (no open redirects). */
export function safeNext(next: string | null | undefined): string | null {
  return next && /^\/[a-z0-9/_-]*$/i.test(next) && !next.startsWith('//') ? next : null;
}

export function destinationFor(profile: Profile | null, next?: string | null): string {
  if (!profile?.onboardingCompletedAt) return '/welcome';
  return safeNext(next) ?? '/for-you';
}

declare const __SIGNAL_DATA_MODE__: 'mock' | 'live';

function defaultLoader(cfg: AccountConfig): () => Promise<AccountBackend> {
  // The compile-time check keeps the mock service out of the production bundle entirely.
  if (__SIGNAL_DATA_MODE__ === 'mock' && cfg.mode === 'mock') return () => import('./mockBackend').then((m) => m.createMockBackend({ latency: 300 }));
  if (cfg.mode === 'supabase') return () => import('./supabaseBackend').then((m) => m.createSupabaseBackend(cfg));
  return notConfigured;
}

export function AccountProvider({
  children,
  config = ACCOUNT_CONFIG,
  backend: injected,
}: {
  children: ReactNode;
  config?: AccountConfig;
  /** Tests pass a ready backend (usually the mock). */
  backend?: AccountBackend;
}) {
  const { locale, setLocale } = useI18n();
  const mode: AccountMode = injected ? injected.kind : config.mode;
  const [status, setStatus] = useState<AccountStatus>(() => (mode === 'off' ? 'off' : injected || mayHaveSession(mode) ? 'restoring' : 'signed-out'));
  const [user, setUser] = useState<AccountUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState<SavedStory[] | null>(null);
  const [dataStatus, setDataStatus] = useState<AccountValue['dataStatus']>('idle');
  const [toast, setToast] = useState<AccountToast | null>(null);
  const [nonce, setNonce] = useState(0);

  const backendRef = useRef<Promise<AccountBackend> | null>(injected ? Promise.resolve(injected) : null);
  const loader = useMemo(() => defaultLoader(config), [config]);
  const userRef = useRef<AccountUser | null>(null);
  const signingOut = useRef(false);
  const savedRef = useRef<SavedStory[] | null>(null);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  const showToast = useCallback((key: AccountMessageKey, tone: 'info' | 'error' = 'info') => setToast({ key, tone, id: Date.now() }), []);

  const clearAccountState = useCallback(() => {
    userRef.current = null;
    setUser(null);
    setProfile(null);
    setPrefs(null);
    setSaved(null);
    setDataStatus('idle');
  }, []);

  const applyUser = useCallback(
    (u: AccountUser | null) => {
      if (!u) {
        const wasSignedIn = userRef.current !== null;
        clearAccountState();
        setStatus('signed-out');
        if (wasSignedIn && !signingOut.current) showToast('session_expired', 'error');
        return;
      }
      if (userRef.current?.id !== u.id) {
        setProfile(null);
        setPrefs(null);
        setSaved(null);
      }
      userRef.current = u;
      setUser(u);
      setStatus('signed-in');
    },
    [clearAccountState, showToast],
  );

  const getBackend = useCallback((): Promise<AccountBackend> => {
    if (!backendRef.current) {
      const p = loader();
      backendRef.current = p;
      p.then(
        (b) => {
          b.onChange((u) => applyUser(u));
        },
        () => {
          backendRef.current = null;
        },
      );
    }
    return backendRef.current;
  }, [loader, applyUser]);

  useEffect(() => {
    if (!injected) return;
    return injected.onChange((u) => applyUser(u));
  }, [injected, applyUser]);

  // Restore a stored password session without flashing the signed-out UI.
  useEffect(() => {
    if (status !== 'restoring') return;
    let alive = true;
    getBackend()
      .then((b) => b.currentUser())
      .then(
        (u) => alive && applyUser(u),
        () => {
          if (!alive) return;
          clearAccountState();
          setStatus('signed-out');
        },
      )
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the reader's own data whenever the signed-in user changes.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    setDataStatus('loading');
    getBackend()
      .then((b) => Promise.all([b.getProfile(), b.getPreferences(), b.listSaved()]))
      .then(
        ([p, pr, s]) => {
          if (!alive) return;
          setProfile(p);
          setPrefs(pr);
          setSaved(s);
          setDataStatus('ready');
        },
        (err: unknown) => {
          if (!alive) return;
          const e = toAccountError(err);
          setDataStatus('error');
          if (e.kind === 'not_signed_in') applyUser(null);
        },
      );
    return () => {
      alive = false;
    };
  }, [userId, nonce, getBackend, applyUser]);

  // Apply the profile's language once per browser session. A brand-new profile still holds the
  // column default, so it must not override the language the reader is using; onboarding saves that.
  useEffect(() => {
    if (!profile || profile.onboardingStep === 0) return;
    const mark = `${profile.id}:${profile.locale}`;
    if (session(LOCALE_APPLIED_KEY) === mark) return;
    session(LOCALE_APPLIED_KEY, mark);
    if (profile.locale !== locale) setLocale(profile.locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.locale]);

  const run = useCallback(
    async <T,>(fn: (b: AccountBackend) => Promise<T>): Promise<T> => {
      if (mode === 'off') throw new AccountError('not_configured');
      try {
        return await fn(await getBackend());
      } catch (err) {
        const e = toAccountError(err);
        if (e.kind === 'not_signed_in' && userRef.current) applyUser(null);
        throw e;
      }
    },
    [mode, getBackend, applyUser],
  );

  const value = useMemo<AccountValue>(
    () => ({
      mode,
      config,
      status,
      user,
      profile,
      dataStatus,
      prefs,
      saved,
      toast,
      prepare: () => {
        if (mode !== 'off') void getBackend().catch(() => {});
      },
      signUp: (username, password, next) =>
        run(async (b) => {
          const u = await b.signUp(username.trim().toLowerCase(), password);
          applyUser(u);
          const p = await b.getProfile();
          setProfile(p);
          return destinationFor(p, next);
        }),
      signIn: (username, password, next) =>
        run(async (b) => {
          const u = await b.signIn(username.trim().toLowerCase(), password);
          applyUser(u);
          const p = await b.getProfile();
          setProfile(p);
          return destinationFor(p, next);
        }),
      signOut: (everywhere) =>
        run(async (b) => {
          signingOut.current = true;
          try {
            await b.signOut(everywhere);
          } finally {
            signingOut.current = false;
            clearAccountState();
            setStatus('signed-out');
            session(LOCALE_APPLIED_KEY, null);
          }
        }),
      updateProfile: (patch) =>
        run(async (b) => {
          const p = await b.updateProfile(patch);
          setProfile(p);
          return p;
        }),
      saveTopics: (topics) =>
        run(async (b) => {
          await b.saveTopics(topics);
          setPrefs((pr) => ({ companies: pr?.companies ?? [], topics: [...new Set(topics)] }));
        }),
      saveCompanies: (companies) =>
        run(async (b) => {
          await b.saveCompanies(companies);
          setPrefs((pr) => ({ topics: pr?.topics ?? [], companies: [...new Set(companies)] }));
        }),
      toggleSaved: (a) =>
        run(async (b) => {
          const before = savedRef.current ?? (await b.listSaved());
          const on = before.some((s) => s.id === a.id);
          // Optimistic: the button flips at once and rolls back if the database refuses.
          setSaved(on ? before.filter((s) => s.id !== a.id) : [snapshotOf(a), ...before]);
          try {
            if (on) await b.removeSaved(a.id);
            else await b.addSaved([snapshotOf(a)]);
          } catch (err) {
            setSaved(before);
            const e = toAccountError(err);
            showToast(e.kind === 'limit_reached' ? 'err_limit_reached' : 'err_save', 'error');
            throw e;
          }
        }),
      removeSaved: (id) =>
        run(async (b) => {
          const before = savedRef.current ?? [];
          setSaved(before.filter((s) => s.id !== id));
          try {
            await b.removeSaved(id);
          } catch (err) {
            setSaved(before);
            showToast('err_save', 'error');
            throw err;
          }
        }),
      addSaved: (items) =>
        run(async (b) => {
          await b.addSaved(items);
          setSaved(await b.listSaved());
        }),
      deleteAccount: () =>
        run(async (b) => {
          signingOut.current = true;
          try {
            await b.deleteAccount();
          } finally {
            signingOut.current = false;
          }
          clearAccountState();
          setStatus('signed-out');
          session(LOCALE_APPLIED_KEY, null);
        }),
      reload: () => setNonce((n) => n + 1),
      showToast,
      dismissToast: () => setToast(null),
    }),
    [mode, config, status, user, profile, dataStatus, prefs, saved, toast, getBackend, run, applyUser, clearAccountState, showToast],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  return useContext(AccountContext);
}
