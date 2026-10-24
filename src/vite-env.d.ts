/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** https://<project-ref>.supabase.co — public; empty when accounts are not set up. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable (or legacy anon) key — public by design, protected by RLS. Never a secret key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** "true" once the Google provider is configured in Supabase. */
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
