import { describe, expect, it } from 'vitest';
import { playableVideo, videoSourceUrl, youtubeEmbedUrl } from './video';
import type { ArticleVideo } from './types';

const yt = (id: string): ArticleVideo => ({ provider: 'youtube', id, url: `https://www.youtube.com/watch?v=${id}` });

describe('playableVideo', () => {
  it('accepts well-formed YouTube ids and https files', () => {
    expect(playableVideo({ video: yt('AbCdEfGhI_1') })).toEqual(yt('AbCdEfGhI_1'));
    const file: ArticleVideo = { provider: 'file', url: 'https://media.example.com/a.mp4', type: 'video/mp4' };
    expect(playableVideo({ video: file })).toEqual(file);
    expect(playableVideo({ video: { provider: 'file', url: 'videos/clip.mp4', type: 'video/mp4' } })).not.toBeNull();
  });

  it('refuses anything that could inject a URL or is not a video', () => {
    expect(playableVideo({})).toBeNull();
    expect(playableVideo({ video: yt('x"><script>') })).toBeNull();
    expect(playableVideo({ video: yt('AbCdEfGhI_1/../../evil') })).toBeNull();
    expect(playableVideo({ video: { provider: 'file', url: 'javascript:alert(1)', type: 'video/mp4' } })).toBeNull();
    expect(playableVideo({ video: { provider: 'file', url: 'http://media.example.com/a.mp4', type: 'video/mp4' } })).toBeNull();
    expect(playableVideo({ video: { provider: 'file', url: '//evil.example.com/a.mp4', type: 'video/mp4' } })).toBeNull();
    expect(playableVideo({ video: { provider: 'file', url: 'https://media.example.com/a.html', type: 'text/html' } })).toBeNull();
    expect(playableVideo({ video: { provider: 'vimeo', id: '1' } as unknown as ArticleVideo })).toBeNull();
  });
});

describe('youtube urls', () => {
  it('embeds through youtube-nocookie and links to the watch page', () => {
    const url = new URL(youtubeEmbedUrl('AbCdEfGhI_1', 'https://example.github.io'));
    expect(url.origin).toBe('https://www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/AbCdEfGhI_1');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('rel')).toBe('0');
    expect(videoSourceUrl(yt('AbCdEfGhI_1'))).toBe('https://www.youtube.com/watch?v=AbCdEfGhI_1');
  });
});
