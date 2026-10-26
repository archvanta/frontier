import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import { forgetImageFits } from '../lib/imageFit';
import type { Article } from '../lib/types';
import { NewsHero, SLIDE_MS, fitSlides } from './NewsHero';

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
    forgetImageFits();
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

  it('keeps the same frame on every slide and shows a placeholder when the photo fails to load', () => {
    renderHero([story('a'), story('b'), story('c', null)]);
    const slides = screen.getAllByTestId('hero-slide');
    expect(slides.map((sl) => sl.querySelectorAll('.nh-frame').length)).toEqual([1, 1, 1]);
    const img = slides[0]!.querySelector('img')!;
    expect(img).toHaveAttribute('src', 'https://img.example.com/a.jpg');
    expect(slides[0]).toHaveAttribute('data-photo', 'yes');
    fireEvent.error(img);
    expect(slides[0]!.querySelector('.nh-img')).toBeNull();
    expect(slides[0]!.querySelector('.nh-fallback-art')).toHaveAttribute('src', expect.stringMatching(/images\/icons\/3d\/models\.webp\?v=1$/));
    expect(slides[0]!.querySelector('.nh-frame')).toHaveClass('is-empty');
    expect(slides[0]).toHaveAttribute('data-photo', 'no');
    // No image at all: the same frame with the placeholder.
    expect(slides[2]!.querySelector('.nh-frame.is-empty')).not.toBeNull();
    expect(slides[2]!.querySelector('.nh-fallback-art')).not.toBeNull();
  });

  it('fills the frame with any photo big enough and drops only tiny ones', () => {
    renderHero([story('a'), story('b'), story('c')]);
    const load = (k: number, width: number, height: number) => {
      const slide = screen.getAllByTestId('hero-slide')[k]!;
      const img = slide.querySelector<HTMLImageElement>('.nh-img')!;
      Object.defineProperty(img, 'naturalWidth', { value: width });
      Object.defineProperty(img, 'naturalHeight', { value: height });
      fireEvent.load(img);
      return slide;
    };
    expect(load(0, 1600, 900)).toHaveAttribute('data-photo', 'yes');
    expect(load(1, 600, 900)).toHaveAttribute('data-photo', 'yes');
    fireEvent.click(screen.getByRole('button', { name: 'Story 3 of 3' })); // a slide's image mounts once it is current or next
    const tiny = load(2, 120, 90);
    expect(tiny).toHaveAttribute('data-photo', 'no');
    expect(tiny.querySelector('.nh-frame.is-empty')).not.toBeNull();
  });

  it('uses a big landscape photo as the slide background too, with the same URL and the same frame; other slides keep the plain gradient', () => {
    renderHero([story('a'), story('b'), story('c')]);
    const load = (k: number, width: number, height: number) => {
      const slide = screen.getAllByTestId('hero-slide')[k]!;
      const img = slide.querySelector<HTMLImageElement>('.nh-img')!;
      Object.defineProperty(img, 'naturalWidth', { value: width });
      Object.defineProperty(img, 'naturalHeight', { value: height });
      fireEvent.load(img);
      return slide;
    };
    const wide = load(0, 1600, 900);
    expect(wide).toHaveAttribute('data-bg', 'yes');
    expect(wide.querySelector('.nh-bg-img')).toHaveAttribute('src', 'https://img.example.com/a.jpg');
    expect(wide.querySelector('.nh-frame img')).toHaveAttribute('src', 'https://img.example.com/a.jpg');
    const boxy = load(1, 800, 600);
    expect(boxy).toHaveAttribute('data-photo', 'yes');
    expect(boxy).toHaveAttribute('data-bg', 'no');
    expect(boxy.querySelector('.nh-bg')).toBeNull();
    // A failing background copy falls back to the plain gradient and leaves the frame alone.
    fireEvent.error(wide.querySelector('.nh-bg-img')!);
    expect(wide).toHaveAttribute('data-bg', 'no');
    expect(wide.querySelector('.nh-frame img')).not.toBeNull();
  });

  it('never clamps the headline', () => {
    renderHero([story('a')]);
    const title = screen.getByRole('heading', { level: 2 });
    expect(title.style.webkitLineClamp).toBe('');
    expect(title.closest('.nh-inner')).not.toBeNull();
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

describe('fitSlides', () => {
  /** jsdom has no layout: a slide's copy is as tall as 600px × its headline scale. */
  function stageWith(heights: number[]) {
    const stage = document.createElement('div');
    for (const h of heights) {
      const slide = document.createElement('div');
      slide.className = 'nh-slide';
      const inner = document.createElement('div');
      inner.className = 'nh-inner';
      Object.defineProperty(inner, 'offsetHeight', { get: () => h * Number(slide.style.getPropertyValue('--nh-scale') || 1) });
      slide.append(inner);
      stage.append(slide);
    }
    return stage;
  }
  const scales = (stage: HTMLElement) => [...stage.querySelectorAll<HTMLElement>('.nh-slide')].map((s) => s.style.getPropertyValue('--nh-scale') || '1');

  it('leaves copy that fits alone and shrinks taller copy just enough', () => {
    const stage = stageWith([500, 800, 3000]);
    fitSlides(stage, 900, 68); // room: 832px
    expect(scales(stage)).toEqual(['1', '1', '0.55']);
    fitSlides(stage, 700, 68); // room: 632px
    expect(scales(stage)).toEqual(['1', '0.75', '0.55']);
  });

  it('never plans for less than the minimum hero height', () => {
    const stage = stageWith([470]);
    fitSlides(stage, 300, 68);
    expect(scales(stage)).toEqual(['1']);
  });
});
