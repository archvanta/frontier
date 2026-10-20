# Accounts setup (Supabase Auth + Postgres)

The site works without any of this: news, search, archive and browser-only bookmarks need no account.
Until the steps below are done, the sign-in screen says plainly that accounts are not switched on yet;
it never pretends to sign anyone in. Everything here is entered in the Supabase, SMTP-provider,
Google Cloud and GitHub **dashboards**. No password, SMTP credential or secret key ever goes into
the repository or the browser bundle.

Dashboard menu names below are the ones Supabase used in October 2026; if a label has moved, the
setting itself is the same.

## 1. Create the Supabase project

1. Sign in at <https://supabase.com> and create a new project (the **Free** plan is enough). Pick a
   region near your readers and save the database password in your password manager. The app never
   needs it.
2. **Project Settings → API Keys**: note the **Project URL** (`https://<project-ref>.supabase.co`) and the
   **publishable key** (`sb_publishable_…`; the legacy `anon` key also works).
   **Never** use the `secret` / `service_role` key anywhere in this project. The build refuses one
   (`vite.config.ts`, `src/lib/account/config.ts`).

## 2. Create the tables and security policies

1. **SQL Editor → New query**: paste all of
   [`supabase/migrations/20261020000000_accounts.sql`](../supabase/migrations/20261020000000_accounts.sql)
   and click **Run**. (With the Supabase CLI: `supabase link` then `supabase db push`.)
2. **Table Editor**: check that `profiles`, `user_preferences`, `user_followed_companies` and
   `user_bookmarks` exist and each shows **RLS enabled**.
3. Run the checks in [ACCOUNTS.md → Security verification](ACCOUNTS.md#security-verification).

## 3. Email one-time codes

1. **Authentication → Sign In / Providers → Email**: keep **Email** enabled and **Confirm email** on
   (never switch confirmation off to "simplify testing"). Set **Email OTP Length** to `6` and
   **Email OTP Expiration** to `600` seconds (the app tells readers codes last 10 minutes).
2. **Authentication → Emails → Templates**: open **Magic Link** and **Confirm signup**, and paste
   [`supabase/templates/otp-code.html`](../supabase/templates/otp-code.html) into both. Suggested subject:
   `Your SIGNAL AI code: {{ .Token }}`. The template must contain `{{ .Token }}`; the app uses only
   the code, not the link.

### Why custom SMTP is required

Supabase's built-in mailer is for trying things out only: it delivers **only to addresses of your
project's team members** and at a very low hourly rate. A public visitor's Gmail address is refused
(the app then shows "This site can't email that address yet…"). Until custom SMTP is set up and a
real delivery to an outside address has been tested, do not announce sign-up as working.

### 4. Custom SMTP (free tiers; no paid plan needed)

Pick one provider, verify what it asks for, and enter its SMTP details in
**Authentication → Emails → SMTP Settings → Enable custom SMTP**. The password is typed only into
the Supabase dashboard.

| Provider | Free allowance (check their pricing page; it changes) | What it needs |
| --- | --- | --- |
| **Resend** (recommended) | about 3,000 emails/month, 100/day | a domain you control, verified with DNS records; sender like `login@yourdomain` |
| **Brevo** | about 300 emails/day | a verified sender; authenticate your domain for good Gmail delivery |
| **Gmail SMTP** with an App Password | small personal volumes (about 500/day) | 2-step verification on the Google account; fine for testing, not for a public launch |

Settings: host and port from the provider (usually port `465` or `587`), sender name `SIGNAL AI`,
sender email on the verified domain. Then **Authentication → Rate Limits**: keep "emails sent per hour"
inside the provider's quota.

## 5. Site URL and redirect URLs

**Authentication → URL Configuration**:

- **Site URL**: `https://sadeghimohammadamin83-ship-it.github.io/SIGNAL_AI/`
- **Redirect URLs** (allow list): the same URL, plus `http://localhost:5173/SIGNAL_AI/` for local development.

Google sign-in returns to exactly this address (`?code=…` before the `#` route); the app finishes the
sign-in, removes the code from the address bar and opens the reader's dashboard or onboarding.

## 6. Google sign-in (optional)

Google OAuth is a separate method. It does **not** send a code.

1. <https://console.cloud.google.com> → create (or pick) a project → **APIs & Services → OAuth consent screen**:
   app name `SIGNAL AI`, your support email, scopes `email`, `profile`, `openid`; publish it.
2. **Credentials → Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://sadeghimohammadamin83-ship-it.github.io`
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy the client ID and client secret into **Supabase → Authentication → Sign In / Providers → Google** and enable it.
4. Set the GitHub variable `SUPABASE_GOOGLE_ENABLED` to `true` (next step). Without it the Google
   button stays hidden.

## 7. Connect the site (GitHub repository variables)

GitHub → repository **Settings → Secrets and variables → Actions → Variables** tab (not *Secrets*:
these values are public by design and are compiled into the page):

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
| `SUPABASE_GOOGLE_ENABLED` | `true` only after step 6 |

Then **Actions → Deploy to GitHub Pages → Run workflow** (or wait for the next hourly news update).
The build adds the Supabase origin to the page's Content-Security-Policy automatically.

For local development put the same values in `.env.local` (git-ignored) as `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_GOOGLE`.

## 8. Abuse protection

- **Rate limits** (Authentication → Rate Limits): keep the defaults or lower them; the app also
  waits 60 seconds before offering "Resend code".
- **Minimum interval between emails per user**: 60 seconds (Providers → Email).
- **CAPTCHA** (Authentication → Attack Protection): Supabase supports hCaptcha and Cloudflare
  Turnstile. The app does not load a CAPTCHA script yet (it would need a third-party script and a
  CSP change); turn it on only together with that client change.
- Each account is capped at 1,000 saved stories by the database itself.
- Error messages never say whether an address already has an account.

## 9. Test it for real

1. Open the live site, **Sign in**, enter an address that is *not* a Supabase team member (for
   example a second Gmail account).
2. The email arrives with a 6-digit code (check spam). Enter it: a new account lands on onboarding.
3. Finish onboarding, save a story, reload: still signed in, story still saved. Sign in on a second
   device: the same interests and saved stories appear.
4. Enter a wrong code (error), wait 10 minutes and use an old code (expired), resend after the
   countdown.
5. Run the [security verification](ACCOUNTS.md#security-verification) with two accounts.
6. Delete the test account from **Account → Delete account** and confirm in **Authentication → Users**
   that it is gone.

Only after steps 1–5 pass may anyone say that email sign-in is live.
