import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import type { Article } from '../lib/types';
import { StoryImage, resolveImageUrl } from './StoryImage';

type Img = Pick<Article, 'image' | 'category' | 'brand' | 'title'>;

function renderImage(article: Img) {
  const { container } = render(
    <I18nProvider initial="en">
      <StoryImage article={article} />
    </I18nProvider>,
  );
  return container.querySelector('img')!;
}

describe('StoryImage', () => {
  it('resolves only http(s) and site-relative URLs', () => {
    expect(resolveImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(resolveImageUrl('images/fallbacks/models.svg')).toMatch(/images\/fallbacks\/models\.svg$/);
    expect(resolveImageUrl('javascript:alert(1)')).toBeNull();
    expect(resolveImageUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(resolveImageUrl(null)).toBeNull();
  });

  it('swaps a broken source image for the category artwork', () => {
    const img = renderImage({ title: 't', category: 'research', brand: null, image: { url: 'https://cdn.example.com/broken.jpg', kind: 'feed', alt: 'A chart' } });
    expect(img.getAttribute('src')).toBe('https://cdn.example.com/broken.jpg');
    expect(img).toHaveAttribute('alt', 'A chart');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer');
    fireEvent.error(img);
    expect(img.getAttribute('src')).toMatch(/images\/fallbacks\/research\.svg$/);
    expect(img).toHaveAttribute('alt', '');
  });

  it('labels brand character art as an unofficial illustration', () => {
    renderImage({ title: 't', category: 'models', brand: 'claude', image: { url: 'images/ai-brands/claude-character.webp', kind: 'brand', alt: 'Claude / Anthropic — unofficial editorial character illustration' } });
    expect(screen.getByText('Unofficial editorial illustration')).toBeInTheDocument();
  });

  it('uses the category fallback when there is no image', () => {
    const img = renderImage({ title: 't', category: 'policy', brand: null, image: null });
    expect(img.getAttribute('src')).toMatch(/images\/fallbacks\/policy\.svg$/);
  });
});
