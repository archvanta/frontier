import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { createMockBackend } from '../../lib/account/mockBackend';
import { MOCK_CODE, MOCK_SESSION_KEY } from '../../lib/account/config';
import type { AccountBackend } from '../../lib/account/types';
import { _resetBookmarkCache, readBookmarks, toggleBookmark } from '../../lib/bookmarks';
import { createDataSource } from '../../lib/data';
import { I18nProvider } from '../../lib/i18n';
import type { Article, Locale } from '../../lib/types';

const PENDING_KEY = 'signal-ai:otp-pending';

function renderApp(hash: string, backend?: AccountBackend, locale: Locale = 'en') {
  window.location.hash = hash;
  return render(
    <I18nProvider initial={locale}>
      <App source={createDataSource('mock', new Date())} account={backend ? { backend } : undefined} />
    </I18nProvider>,
  );
}

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

/** Signs a user in directly through the mock service (as if they had used the code screen earlier). */
async function signedInBackend(email = 'ada@example.com', setup?: (b: AccountBackend) => Promise<void>) {
  const b = createMockBackend();
  await b.requestCode(email);
  await b.verifyCode(email, MOCK_CODE);
  await setup?.(b);
  return b;
}

const typeEmail = (value: string) => fireEvent.change(screen.getByLabelText('Email address'), { target: { value } });
const sendCode = () => fireEvent.click(screen.getByRole('button', { name: 'Send code' }));
const typeCode = (value: string) => fireEvent.change(screen.getByLabelText('Verification code'), { target: { value } });

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  _resetBookmarkCache();
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('public browsing', () => {
  it('works with accounts switched off, and says so honestly on account screens', async () => {
    renderApp('#/');
    expect(await screen.findByRole('heading', { name: 'Top Signals' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '#/signin');
    await go('#/signin');
    expect(await screen.findByTestId('auth-not-configured')).toHaveTextContent('Accounts aren’t switched on yet');
    expect(screen.getByTestId('auth-not-configured')).toHaveTextContent('VITE_SUPABASE_URL');
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    await go('#/for-you');
    expect(await screen.findByTestId('auth-not-configured')).toBeInTheDocument();
  });

  it('keeps news open to signed-out visitors when accounts are on', async () => {
    renderApp('#/', createMockBackend());
    expect(await screen.findByRole('heading', { name: 'Top Signals' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    await go('#/for-you');
    expect(await screen.findByText('Sign in to see this page')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '#/signin?next=%2Ffor-you');
  });
});

describe('email code sign-in', () => {
  it('requests a code, rejects a wrong one, then signs a new user into onboarding', async () => {
    const backend = createMockBackend();
    renderApp('#/signin', backend);
    await screen.findByRole('heading', { name: 'Sign in to FRONTIER' });

    typeEmail('not-an-email');
    sendCode();
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');

    typeEmail('Ada@Example.com');
    sendCode();
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByText(/a••@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Resend code in/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend code' })).not.toBeInTheDocument();

    typeCode('654321');
    expect(await screen.findByRole('alert')).toHaveTextContent('That code didn’t work');

    typeCode(MOCK_CODE);
    await waitFor(() => expect(window.location.hash).toBe('#/welcome'));
    expect(await screen.findByTestId('onboarding')).toHaveAttribute('data-step', '1');
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: /Account menu/ })).toBeInTheDocument();
  });

  it('accepts digits typed on a Persian keyboard', async () => {
    renderApp('#/signin', createMockBackend());
    typeEmail('ada@example.com');
    sendCode();
    await screen.findByRole('heading', { name: 'Check your email' });
    typeCode('۱۲۳۴۵۶');
    await waitFor(() => expect(window.location.hash).toBe('#/welcome'));
  });

  it('lets the reader change the address before verifying', async () => {
    renderApp('#/signin', createMockBackend());
    typeEmail('typo@example.com');
    sendCode();
    await screen.findByRole('heading', { name: 'Check your email' });
    fireEvent.click(screen.getByRole('button', { name: 'Change email' }));
    expect(await screen.findByLabelText('Email address')).toHaveValue('typo@example.com');
    expect(window.sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('keeps the code screen across a reload and explains an expired code', async () => {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email: 'ada@example.com', sentAt: Date.now() - 11 * 60_000 }));
    renderApp('#/signin', createMockBackend());
    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    typeCode(MOCK_CODE);
    expect(await screen.findByRole('alert')).toHaveTextContent('This code has expired. Request a new one.');
  });

  it('offers resend only after the cooldown, and confirms a new code', async () => {
    window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email: 'ada@example.com', sentAt: Date.now() - 61_000 }));
    renderApp('#/signin', createMockBackend());
    fireEvent.click(await screen.findByRole('button', { name: 'Resend code' }));
    expect(await screen.findByText('A new code is on its way.')).toBeInTheDocument();
    expect(screen.getByText(/Resend code in/)).toBeInTheDocument();
  });

  it.each([
    ['ratelimit@example.com', 'Too many attempts'],
    ['offline@example.com', 'Couldn’t reach the sign-in service'],
    ['blocked@example.com', 'email delivery is still being set up'],
  ])('shows a clear message for %s', async (email, text) => {
    renderApp('#/signin', createMockBackend());
    typeEmail(email);
    sendCode();
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.queryByRole('heading', { name: 'Check your email' })).not.toBeInTheDocument();
  });

  it('labels mock mode and never claims an email was sent for real', async () => {
    renderApp('#/signin', createMockBackend());
    expect(await screen.findByText(/Mock mode: no email is sent/)).toHaveAttribute('role', 'note');
  });

  it('renders right-to-left in Persian while email and code stay left-to-right', async () => {
    renderApp('#/signin', createMockBackend(), 'fa');
    expect(await screen.findByRole('heading', { name: 'ورود به فرانتیر' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByLabelText('نشانی ایمیل')).toHaveAttribute('dir', 'ltr');
    fireEvent.change(screen.getByLabelText('نشانی ایمیل'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'ارسال کد' }));
    const code = await screen.findByLabelText('کد تأیید');
    expect(code.closest('.otp')).toHaveAttribute('dir', 'ltr');
  });
});

describe('sessions', () => {
  it('restores a stored session after a reload without showing "Sign in"', async () => {
    const backend = await signedInBackend();
    const view = renderApp('#/', backend);
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Account menu/ })).toBeInTheDocument();
    view.unmount();
    renderApp('#/account', createMockBackend());
    expect(await screen.findByText('ada@example.com', { selector: '.acct-email span' })).toBeInTheDocument();
  });

  it('signs out, forgets the session and falls back to local bookmarks', async () => {
    const backend = await signedInBackend('ada@example.com', async (b) => {
      await b.addSaved([{ id: 'abcdef12', day: '2026-10-20', title: 'Cloud story', sourceName: 'S', url: 'https://example.com/c', publishedAt: '', savedAt: '' }]);
    });
    renderApp('#/saved', backend);
    expect(await screen.findByText('Cloud story')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /Account menu/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(window.localStorage.getItem(MOCK_SESSION_KEY)).toBeNull();
    await go('#/saved');
    expect(await screen.findByText('You have not saved any stories yet.')).toBeInTheDocument();
    expect(screen.queryByText('Cloud story')).not.toBeInTheDocument();
  });

  it('tells the reader when a session ends on its own', async () => {
    const backend = await signedInBackend();
    renderApp('#/', backend);
    await screen.findByRole('button', { name: /Account menu/ });
    // Simulate the server revoking the session (e.g. refresh token expired): the service signs out by itself.
    await act(async () => {
      await backend.signOut();
    });
    // signOut through the backend directly is not "user initiated" from the app's point of view.
    expect(await screen.findByText(/Your session expired/)).toBeInTheDocument();
  });
});

describe('profile and onboarding', () => {
  it('walks through onboarding, survives a reload mid-way and finishes only after saving', async () => {
    const backend = await signedInBackend();
    const view = renderApp('#/welcome', backend);
    const ob = await screen.findByTestId('onboarding');
    expect(ob).toHaveAttribute('data-step', '1');
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('onboarding')).toHaveAttribute('data-step', '2'));
    fireEvent.click(screen.getByRole('button', { name: /AI Research/ }));
    expect(screen.getByRole('button', { name: /AI Research/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('onboarding')).toHaveAttribute('data-step', '3'));
    expect(await backend.getPreferences()).toEqual({ topics: ['research'], companies: [] });

    view.unmount();
    renderApp('#/welcome', createMockBackend());
    await waitFor(() => expect(screen.getByTestId('onboarding')).toHaveAttribute('data-step', '3'));
    fireEvent.click(screen.getByRole('button', { name: /OpenAI/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('onboarding')).toHaveAttribute('data-step', '4'));
    const review = screen.getByTestId('onboarding');
    expect(within(review).getByText('AI Research')).toBeInTheDocument();
    expect(within(review).getByText('OpenAI')).toBeInTheDocument();
    expect((await backend.getProfile()).onboardingCompletedAt).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(window.location.hash).toBe('#/for-you'));
    const p = await backend.getProfile();
    expect(p.displayName).toBe('Ada');
    expect(p.onboardingCompletedAt).not.toBeNull();
    expect(await backend.getPreferences()).toEqual({ topics: ['research'], companies: ['openai'] });
  });

  it('does not mark onboarding complete when saving fails', async () => {
    const base = await signedInBackend();
    await base.updateProfile({ onboardingStep: 3 });
    const failing: AccountBackend = { ...base, saveCompanies: () => Promise.reject(new TypeError('Failed to fetch')) };
    renderApp('#/welcome', failing);
    await waitFor(() => expect(screen.getByTestId('onboarding')).toHaveAttribute('data-step', '4'));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t reach the sign-in service');
    expect(window.location.hash).toBe('#/welcome');
    expect((await base.getProfile()).onboardingCompletedAt).toBeNull();
  });

  it('keeps the reader’s language for a new account and applies the saved one for a returning account', async () => {
    const view = renderApp('#/signin', createMockBackend(), 'fa');
    fireEvent.change(await screen.findByLabelText('نشانی ایمیل'), { target: { value: 'new@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'ارسال کد' }));
    fireEvent.change(await screen.findByLabelText('کد تأیید'), { target: { value: MOCK_CODE } });
    await waitFor(() => expect(window.location.hash).toBe('#/welcome'));
    await screen.findByTestId('onboarding');
    expect(document.documentElement.lang).toBe('fa');
    view.unmount();
    window.sessionStorage.clear();

    const returning = await signedInBackend('fa@example.com', async (b) => {
      await b.updateProfile({ locale: 'fa', onboardingStep: 4, onboardingCompletedAt: new Date().toISOString() });
    });
    renderApp('#/', returning, 'en');
    await waitFor(() => expect(document.documentElement.lang).toBe('fa'));
  });

  it('sends returning users straight to their dashboard', async () => {
    const backend = createMockBackend();
    await backend.requestCode('ada@example.com');
    await backend.verifyCode('ada@example.com', MOCK_CODE);
    await backend.updateProfile({ onboardingStep: 4, onboardingCompletedAt: new Date().toISOString() });
    await backend.signOut();
    renderApp('#/signin', backend);
    typeEmail('ada@example.com');
    sendCode();
    await screen.findByRole('heading', { name: 'Check your email' });
    typeCode(MOCK_CODE);
    await waitFor(() => expect(window.location.hash).toBe('#/for-you'));
  });

  it('updates the profile and preferences from account settings', async () => {
    const backend = await signedInBackend();
    renderApp('#/account', backend);
    const name = await screen.findByLabelText('Display name');
    fireEvent.change(name, { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText('Avatar image URL (optional)'), { target: { value: 'javascript:alert(1)' } });
    expect(screen.getByText('Use an https:// link of up to 500 characters.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Avatar image URL (optional)'), { target: { value: '' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0]!);
    expect(await screen.findByText('Saved.')).toBeInTheDocument();
    expect((await backend.getProfile()).displayName).toBe('Ada Lovelace');

    fireEvent.click(screen.getByRole('button', { name: /NVIDIA/ }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[2]!);
    await waitFor(async () => expect((await backend.getPreferences()).companies).toEqual(['nvidia']));
  });

  it('deletes the account only after the email is typed', async () => {
    const backend = await signedInBackend();
    renderApp('#/account', backend);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account…' }));
    const go = screen.getByRole('button', { name: 'Delete my account permanently' });
    expect(go).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Type your email address to confirm'), { target: { value: 'ada@example.com' } });
    fireEvent.click(go);
    await waitFor(() => expect(window.location.hash).toBe('#/'));
    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument();
    expect(await backend.currentUser()).toBeNull();
  });
});

describe('personal feed', () => {
  it('ranks stories for the reader and explains why', async () => {
    const backend = await signedInBackend('ada@example.com', async (b) => {
      await b.updateProfile({ displayName: 'Ada', onboardingStep: 4, onboardingCompletedAt: new Date().toISOString() });
      await b.saveCompanies(['openai']);
      await b.saveTopics(['research']);
    });
    renderApp('#/for-you', backend);
    expect(await screen.findByRole('heading', { name: 'Hi, Ada' })).toBeInTheDocument();
    const items = await screen.findAllByTestId('fy-item');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toHaveAttribute('data-personal', 'true');
    const reasons = screen.getAllByTestId('fy-reason').map((r) => r.textContent);
    expect(reasons.some((r) => /OpenAI|AI Research/.test(r ?? ''))).toBe(true);
    expect(screen.getByRole('heading', { name: 'Followed companies' })).toBeInTheDocument();
  });

  it('shows the global feed when no interests are chosen', async () => {
    renderApp('#/for-you', await signedInBackend());
    expect(await screen.findByText('You haven’t picked any interests yet, so this is the global feed.')).toBeInTheDocument();
    expect((await screen.findAllByTestId('fy-item')).length).toBeGreaterThan(0);
  });
});

describe('cloud bookmarks', () => {
  it('saves to the account without duplicates', async () => {
    const backend = await signedInBackend();
    renderApp('#/', backend);
    await screen.findByRole('button', { name: /Account menu/ });
    const card = (await screen.findAllByTestId('story-card'))[0]!;
    fireEvent.click(within(card).getByRole('button', { name: 'Save story' }));
    await waitFor(async () => expect(await backend.listSaved()).toHaveLength(1));
    const [saved] = await backend.listSaved();
    await backend.addSaved([saved!]);
    expect(await backend.listSaved()).toHaveLength(1);
    expect(readBookmarks()).toHaveLength(0); // nothing leaked into the signed-out store
    expect(within(card).getByRole('button', { name: 'Remove from saved' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers to copy this browser’s bookmarks into the account and keeps them locally', async () => {
    toggleBookmark({ id: 'feed0001', day: '2026-10-19', title: 'Local story', sourceName: 'S', url: 'https://example.com/l', publishedAt: '2026-10-19T00:00:00Z' } as Article);
    const backend = await signedInBackend();
    renderApp('#/saved', backend);
    const offer = await screen.findByTestId('merge-offer');
    expect(offer).toHaveTextContent('You have 1 stories saved in this browser');
    expect(screen.getByTestId('saved-local-row')).toHaveTextContent('Local story');
    fireEvent.click(within(offer).getByRole('button', { name: 'Add to my account' }));
    await waitFor(() => expect(screen.queryByTestId('merge-offer')).not.toBeInTheDocument());
    expect((await backend.listSaved()).map((s) => s.id)).toEqual(['feed0001']);
    expect(readBookmarks().map((b) => b.id)).toEqual(['feed0001']);
    expect(screen.getByTestId('saved-row')).toHaveTextContent('Local story');
  });

  it('remembers "Not now" without discarding anything', async () => {
    toggleBookmark({ id: 'feed0002', day: '2026-10-19', title: 'Kept story', sourceName: 'S', url: 'https://example.com/k', publishedAt: '2026-10-19T00:00:00Z' } as Article);
    const backend = await signedInBackend();
    const view = renderApp('#/saved', backend);
    fireEvent.click(within(await screen.findByTestId('merge-offer')).getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(screen.queryByTestId('merge-offer')).not.toBeInTheDocument());
    expect(screen.getByTestId('saved-local-row')).toHaveTextContent('Kept story');
    expect(await backend.listSaved()).toHaveLength(0);
    view.unmount();
    renderApp('#/saved', createMockBackend());
    await screen.findByTestId('saved-local-row');
    expect(screen.queryByTestId('merge-offer')).not.toBeInTheDocument();
  });
});
