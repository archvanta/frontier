import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import type { Article } from '../lib/types';
import { NewsHero, SLIDE_MS } from './NewsHero';

function story(id: string, image: Article['image'] = { url: `https://img.example.com/${id}.jpg`, kind: 'og' }): Article {
  return {
    id,
    url: `https://example.com/${id}`,
    sourceId: 's',
    sourceName: 'Source',
    title: `Headline ${id}`,
    excerpt: `Excerpt ${id}`,
    lang: 'en',
    publishedAt: '2026-10-20T05:00:00Z',
    dateEstimated: false,
    fetchedAt: '2026-10-20T05:00:00Z',
    day: '2026-10-20',
    category: 'models',
    tags: [],
    entities: [],
    brand: null,
    image,
    eventId: id,
    related: [],
  };
}

const renderHero = (stories: Article[] | null) =>
  render(
    <I18nProvider initial="en">
      <NewsHero stories={stories} />
    </I18nProvider>,
  );

describe('NewsHero', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('shows the brand heading while loading and with no stories', () => {
    const { unmount } = renderHero(null);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('THE WORLD IS CHANGING.');
    expect(screen.getByRole('status')).toHaveTextContent('Loading featured stories');
    unmount();
    renderHero([]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TRACK THE SIGNAL.');
    expect(screen.queryByTestId('hero-slide')).toBeNull();
  });

  it('falls back to the gradient backdrop when the story image fails to load', () => {
    renderHero([story('a'), story('b'), story('c')]);
    const slide = screen.getAllByTestId('hero-slide')[0]!;
    const img = slide.querySelector('img')!;
    expect(img).toHaveAttribute('src', 'https://img.example.com/a.jpg');
    expect(slide).not.toHaveClass('is-art');
    fireEvent.error(img);
    expect(slide.querySelector('img')).toBeNull();
    expect(slide).toHaveClass('is-art');
  });

  it('treats a tiny feed thumbnail as unusable at full width', () => {
    renderHero([story('a'), story('b'), story('c')]);
    const slide = screen.getAllByTestId('hero-slide')[0]!;
    const img = slide.querySelector('img')!;
    Object.defineProperty(img, 'naturalWidth', { value: 120 });
    fireEvent.load(img);
    expect(slide).toHaveClass('is-art');
  });

  it('keeps inactive slides out of the accessibility tree and advances on a timer', () => {
    vi.useFakeTimers();
    const frames = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    let clock = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.set(nextId, cb);
      return nextId++;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => void frames.delete(id));
    renderHero([story('a'), story('b'), story('c')]);
    const slides = screen.getAllByTestId('hero-slide');
    expect(slides.map((s) => s.getAttribute('aria-hidden'))).toEqual(['false', 'true', 'true']);
    const step = (ms: number) =>
      act(() => {
        clock += ms;
        const pending = [...frames.entries()];
        frames.clear();
        pending.forEach(([, cb]) => cb(clock));
      });
    const run = (ms: number) => {
      for (let left = ms; left > 0; left -= 250) step(Math.min(250, left));
    };
    step(0);
    run(SLIDE_MS / 2);
    expect(slides[0]).toHaveAttribute('aria-hidden', 'false');
    run(SLIDE_MS / 2 + 10);
    expect(slides.map((s) => s.getAttribute('aria-hidden'))).toEqual(['true', 'false', 'true']);
    expect(within(slides[1]!).getByRole('heading', { level: 2 })).toHaveTextContent('Headline b');
  });

  it('pausing stops the timer and a manual change shows the chosen story', () => {
    renderHero([story('a'), story('b'), story('c')]);
    fireEvent.click(screen.getByRole('button', { name: 'Pause slideshow' }));
    expect(screen.getByRole('button', { name: 'Start slideshow' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Story 3 of 3' }));
    expect(screen.getAllByTestId('hero-slide')[2]).toHaveAttribute('aria-hidden', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Next story' }));
    expect(screen.getAllByTestId('hero-slide')[0]).toHaveAttribute('aria-hidden', 'false');
  });
});
