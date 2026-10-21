import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import type { Article } from '../lib/types';
import { DaySection } from './DaySection';

const story = (n: number): Article => ({
  id: `s${n}`,
  url: `https://example.com/${n}`,
  sourceId: 's',
  sourceName: 'Source',
  title: `Headline ${n}`,
  excerpt: '',
  lang: 'en',
  publishedAt: '2026-10-20T05:00:00Z',
  dateEstimated: false,
  fetchedAt: '2026-10-20T05:00:00Z',
  day: '2026-10-20',
  category: 'models',
  tags: [],
  entities: [],
  brand: null,
  image: null,
  eventId: `s${n}`,
  related: [],
});

const day = (count: number, listLimit?: number) =>
  render(
    <I18nProvider initial="en">
      <DaySection day="2026-10-20" articles={Array.from({ length: count }, (_, i) => story(i))} listLimit={listLimit} />
    </I18nProvider>,
  );

describe('DaySection', () => {
  it('shows every story when no limit is set', () => {
    day(40);
    expect(screen.getAllByTestId('story-card')).toHaveLength(40);
    expect(screen.queryByRole('button', { name: /Show more/ })).toBeNull();
  });

  it('folds a long list of rows behind a button that shows how many are left and reveals them in steps', () => {
    day(60, 12);
    // lead + 3 cards + 12 rows
    expect(screen.getAllByTestId('story-card')).toHaveLength(16);
    const more = screen.getByRole('button', { name: /Show more stories/ });
    expect(more).toHaveTextContent('44');
    fireEvent.click(more);
    expect(screen.getAllByTestId('story-card')).toHaveLength(40);
    expect(screen.getByRole('button', { name: /Show more stories/ })).toHaveTextContent('20');
    fireEvent.click(screen.getByRole('button', { name: /Show more stories/ }));
    expect(screen.getAllByTestId('story-card')).toHaveLength(60);
    expect(screen.queryByRole('button', { name: /Show more/ })).toBeNull();
  });

  it('keeps the newest story as the lead card and the rest in order', () => {
    day(30, 12);
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles.slice(0, 3)).toEqual(['Headline 0', 'Headline 1', 'Headline 2']);
  });
});
