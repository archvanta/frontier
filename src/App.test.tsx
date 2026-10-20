import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { createDataSource } from './lib/data';
import { I18nProvider } from './lib/i18n';
import type { Locale } from './lib/types';

function renderApp(locale: Locale = 'en', hash = '#/') {
  window.location.hash = hash;
  return render(
    <I18nProvider initial={locale}>
      <App source={createDataSource('mock', new Date())} />
    </I18nProvider>,
  );
}

describe('App with mock data', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders hero, top signals, today and yesterday with a mock banner', async () => {
    renderApp();
    expect(screen.getByRole('note')).toHaveTextContent('MOCK DATA');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('FRONTIER');
    expect(await screen.findByRole('heading', { name: 'Top Signals' })).toBeInTheDocument();
    const today = await screen.findByRole('heading', { name: 'Today' });
    const yesterday = screen.getByRole('heading', { name: 'Yesterday' });
    // Today comes before Yesterday in document order.
    expect(today.compareDocumentPosition(yesterday) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const todaySection = today.closest('section')!;
    expect(within(todaySection).getAllByTestId('story-card').length).toBeGreaterThan(0);
  });

  it('orders cards newest first within a day', async () => {
    renderApp();
    const section = (await screen.findByRole('heading', { name: 'Today' })).closest('section')!;
    const times = within(section)
      .getAllByTestId('story-card')
      .map((c) => c.querySelector('time')!.getAttribute('datetime')!);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it('switches to Persian with RTL document direction', async () => {
    renderApp('fa');
    expect(await screen.findByRole('heading', { name: 'امروز' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('fa');
  });

  it('renders the hero carousel over real stories with a single active slide', async () => {
    renderApp();
    const slides = await screen.findAllByTestId('hero-slide');
    expect(slides.length).toBeGreaterThanOrEqual(3);
    expect(slides.filter((s) => s.getAttribute('aria-hidden') === 'false')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Next story' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pause slideshow' })).toBeInTheDocument();
    const active = slides.find((s) => s.getAttribute('aria-hidden') === 'false')!;
    expect(within(active).getByRole('link', { name: /Read full story/ })).toHaveAttribute('href', expect.stringContaining('#/story/'));
  });

  it('shows the signal wall with real headlines', async () => {
    renderApp();
    const wall = await screen.findByTestId('signal-wall');
    expect(within(wall).getByRole('heading', { name: 'Signal wall' })).toBeInTheDocument();
    expect(within(wall).getAllByTestId('wall-card').length).toBeGreaterThan(0);
  });
});
