# Accounts setup (Supabase username + password)

FRONTIER uses Supabase Auth and Postgres for optional accounts. Readers choose a username and
password; no real email address, SMTP provider, Google login, or paid service is required.

## 1. Database

Run `supabase/migrations/20261020000000_accounts.sql` once in the Supabase SQL Editor. Confirm that
`profiles`, `user_preferences`, `user_followed_companies`, and `user_bookmarks` exist with RLS
enabled.

## 2. Password authentication

In **Authentication → Sign In / Providers → Email**:

- Keep the Email provider enabled. Supabase calls username/password accounts “email/password”
  internally because it requires an email-shaped identifier.
- Turn **Confirm email** off. FRONTIER generates a private, non-routable internal alias from the
  username, so there is no mailbox that could receive a confirmation message.
- Keep password protection and rate-limit defaults enabled. The UI requires at least 8 characters.

The app maps `ada` to `ada@users.frontier.invalid` only when talking to Supabase Auth. It never
shows or sends that alias. Supabase stores a password hash; application tables never store the
password.

There is deliberately no email recovery. Readers are told to keep their username and password in a
password manager. Adding recovery later requires a verified recovery channel and a separate design.

## 3. Connect the deployed site

The deploy workflow includes this project's public URL and publishable key as defaults.
To connect a different project, override them in GitHub repository
**Settings → Secrets and variables → Actions → Variables**:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | `https://hmzymghgpoketcbxyirr.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | the project's `sb_publishable_…` key |

Then run **Actions → Deploy to GitHub Pages → Run workflow**. These are public browser settings;
never use a `secret` or `service_role` key.

For local development use the matching `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY` values in `.env.local`.

## 4. Verify

1. Create a new username and password on `#/signin?mode=create`.
2. Finish onboarding, save a story, and reload: the session and saved story should remain.
3. Sign out, sign back in with the same credentials, and confirm the data returns.
4. Enter a wrong password and confirm the error does not reveal whether a username exists.
5. Test a second account and confirm RLS prevents either account from reading the other's rows.
6. Delete a test account from the Account page and confirm it disappears from Authentication Users.
