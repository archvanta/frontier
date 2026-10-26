import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import { forgetImageFits } from '../lib/imageFit';
import type { Article } from '../lib/types';
import { StoryImage, resolveImageUrl } from './StoryImage';

type Img = Pick<Article, 'image' | 'category' | 'brand' | 'title'>;

function renderImage(article: Img, onFit?: (fit: 'ok' | 'hide') => void) {
  const { container } = render(
    <I18nProvider initial="en">
      <StoryImage article={article} onFit={onFit} />
    </I18nProvider>,
  );
  return container.querySelector('img')!;
}

function load(img: HTMLImageElement, width: number, height: number) {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
}

describe('StoryImage', () => {
  beforeEach(() => forgetImageFits());

  it('resolves only http(s) and site-relative URLs', () => {
    expect(resolveImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(resolveImageUrl('images/fallbacks/models.svg')).toMatch(/images\/fallbacks\/models\.svg$/);
    expect(resolveImageUrl('javascript:alert(1)')).toBeNull();
    expect(resolveImageUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(resolveImageUrl(null)).toBeNull();
  });

  it('drops a broken source image instead of showing something else in its place', () => {
    const onFit = vi.fn();
    const img = renderImage(
      { title: 't', category: 'research', brand: null, image: { url: 'https://cdn.example.com/broken.jpg', kind: 'feed', alt: 'A chart' } },
      onFit,
    );
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/broken.jpg');
    expect(img).toHaveAttribute('alt', 'A chart');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    fireEvent.error(img);
    expect(document.querySelector('.story-media')).toBeNull();
    expect(onFit).toHaveBeenCalledWith('hide');
  });

  it('keeps a photo big enough to fill the frame and drops a tiny one', () => {
    const ok = vi.fn();
    load(renderImage({ title: 't', category: 'models', brand: null, image: { url: 'https://cdn.example.com/wide.jpg', kind: 'og' } }, ok), 1200, 630);
    expect(document.querySelector('.story-media img')).not.toBeNull();
    expect(ok).not.toHaveBeenCalledWith('hide');
    for (const [w, h] of [
      [160, 90],
      [600, 100],
    ] as const) {
      const hide = vi.fn();
      const { unmount } = render(
        <I18nProvider initial="en">
          <StoryImage
            article={{ title: 't', category: 'models', brand: null, image: { url: `https://cdn.example.com/${w}x${h}.jpg`, kind: 'og' } }}
            onFit={hide}
          />
        </I18nProvider>,
      );
      load(document.querySelector<HTMLImageElement>(`img[src$="${w}x${h}.jpg"]`)!, w, h);
      expect(hide).toHaveBeenCalledWith('hide');
      expect(document.querySelector(`img[src$="${w}x${h}.jpg"]`)).toBeNull();
      unmount();
    }
  });

  it('labels brand character art as an unofficial illustration', () => {
    renderImage({
      title: 't',
      category: 'models',
      brand: 'claude',
      image: { url: 'images/ai-brands/claude-character.webp', kind: 'brand', alt: 'Claude / Anthropic — unofficial editorial character illustration' },
    });
    expect(screen.getByText('Unofficial editorial illustration')).toBeInTheDocument();
  });

  it('uses the category fallback when there is no image', () => {
    const img = renderImage({ title: 't', category: 'policy', brand: null, image: null });
    expect(img.getAttribute('src')).toMatch(/images\/icons\/3d\/policy\.webp\?v=1$/);
  });

  it('upgrades stored legacy fallbacks to the generated category art', () => {
    const img = renderImage({ title: 't', category: 'models', brand: null, image: { url: 'images/fallbacks/models.svg', kind: 'fallback' } });
    expect(img.getAttribute('src')).toMatch(/images\/icons\/3d\/models\.webp\?v=1$/);
  });
});
