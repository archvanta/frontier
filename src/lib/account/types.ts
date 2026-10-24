import type { Bookmark } from '../bookmarks';
import type { Locale } from '../types';
import type { CompanyId, TopicId } from './catalog';

/** The signed-in identity as Supabase Auth reports it. Never taken from user input. */
export interface AccountUser {
  id: string;
  /** Public account handle. The internal Supabase email alias is never shown to readers. */
  username: string;
  /** 'email' is Supabase's provider name for username/password accounts. */
  provider: string;
  lastSignInAt: string | null;
  /** Optional auth metadata used only to pre-fill onboarding. */
  suggestedName: string | null;
  suggestedAvatar: string | null;
}

export interface Profile {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  locale: Locale;
  /** Last finished onboarding step, 0–4. */
  onboardingStep: number;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePatch {
  displayName?: string | null;
  avatarUrl?: string | null;
  locale?: Locale;
  onboardingStep?: number;
  onboardingCompletedAt?: string | null;
}

export interface Preferences {
  topics: TopicId[];
  companies: CompanyId[];
}

/** Cloud bookmarks keep the same attribution snapshot as local ones. */
export type SavedStory = Bookmark;

export type AccountErrorKind =
  | 'invalid_username'
  | 'invalid_password'
  | 'username_taken'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'network'
  /** Username/password signup is switched off in the Supabase dashboard. */
  | 'method_disabled'
  | 'not_signed_in'
  | 'limit_reached'
  | 'not_configured'
  | 'unknown';

export class AccountError extends Error {
  readonly kind: AccountErrorKind;
  constructor(kind: AccountErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'AccountError';
    this.kind = kind;
  }
}

export type AuthChangeReason = 'signed_in' | 'signed_out' | 'refreshed' | 'updated';

/**
 * Everything the app needs from an account service. Every data call acts on the caller's own rows:
 * no method takes a user id, and the Supabase implementation relies on RLS + `auth.uid()` defaults.
 */
export interface AccountBackend {
  readonly kind: 'supabase' | 'mock';
  /** Restores a stored session (refreshing it if needed); null when signed out. */
  currentUser(): Promise<AccountUser | null>;
  onChange(cb: (user: AccountUser | null, reason: AuthChangeReason) => void): () => void;
  signUp(username: string, password: string): Promise<AccountUser>;
  signIn(username: string, password: string): Promise<AccountUser>;
  signOut(everywhere?: boolean): Promise<void>;
  /** Reads the caller's profile, creating it on first use. */
  getProfile(): Promise<Profile>;
  updateProfile(patch: ProfilePatch): Promise<Profile>;
  getPreferences(): Promise<Preferences>;
  saveTopics(topics: TopicId[]): Promise<void>;
  saveCompanies(companies: CompanyId[]): Promise<void>;
  listSaved(): Promise<SavedStory[]>;
  /** Adds stories; ones already saved are left as they are (no duplicates). */
  addSaved(items: SavedStory[]): Promise<void>;
  removeSaved(articleId: string): Promise<void>;
  deleteAccount(): Promise<void>;
}
