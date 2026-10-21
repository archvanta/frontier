import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../lib/i18n';
import type { Article, ArticleVideo } from '../lib/types';
import { VideoPlayer } from './VideoPlayer';

const article = {
  id: 'abc',
  url: 'https://example.com/a',
  sourceId: 's',
  sourceName: 'Fixture Channel',
  title: 'Fixture video story',
  excerpt: '',
  lang: 'en',
  publishedAt: '2026-10-19T08:00:00Z',
  dateEstimated: false,
  fetchedAt: '2026-10-19T08:10:00Z',
  day: '2026-10-19',
  category: 'models',
  tags: [],
  entities: [],
  brand: null,
  image: { url: 'https://i.ytimg.com/vi/AbCdEfGhI_1/hqdefault.jpg', kind: 'feed' },
  eventId: 'abc',
  related: [],
} satisfies Article;

function renderPlayer(video: ArticleVideo, locale: 'en' | 'fa' = 'en') {
  return render(
    <I18nProvider initial={locale}>
      <VideoPlayer article={article} video={video} />
    </I18nProvider>,
  );
}

describe('VideoPlayer', () => {
  it('loads nothing from YouTube until play is pressed, then plays in the privacy-enhanced player', () => {
    const { container } = renderPlayer({ provider: 'youtube', id: 'AbCdEfGhI_1', url: 'https://www.youtube.com/watch?v=AbCdEfGhI_1' });
    expect(container.querySelector('iframe')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Play video: Fixture video story/ }));
    const frame = container.querySelector('iframe')!;
    const src = new URL(frame.getAttribute('src')!);
    expect(src.origin).toBe('https://www.youtube-nocookie.com');
    expect(src.pathname).toBe('/embed/AbCdEfGhI_1');
    expect(src.searchParams.get('autoplay')).toBe('1');
    expect(frame.getAttribute('title')).toBe('Video: Fixture video story');
  });

  it('plays a publisher video file in a native player with controls', () => {
    const { container } = renderPlayer({ provider: 'file', url: 'https://media.example.com/clip.mp4', type: 'video/mp4' });
    expect(container.querySelector('video')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    const video = container.querySelector('video')!;
    expect(video.getAttribute('src')).toBe('https://media.example.com/clip.mp4');
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.getAttribute('poster')).toBe(article.image.url);
  });

  it('labels the play button in Persian', () => {
    renderPlayer({ provider: 'youtube', id: 'AbCdEfGhI_1', url: 'https://www.youtube.com/watch?v=AbCdEfGhI_1' }, 'fa');
    expect(screen.getByRole('button', { name: /پخش ویدیو/ })).toBeTruthy();
  });
});
