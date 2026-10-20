import { useEffect, useRef, type CSSProperties } from 'react';
import { useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import { Icon, type IconName } from './Icon';
import { assetUrl } from './StoryImage';

/**
 * First scene of the homepage: what the site is, in one calm screen, with the three ways in. The page's h1 lives here.
 * The backdrop is plain CSS (drifting light, a moving grid, a light sweep and a few rising specks): transforms and opacity only, nothing to
 * download, and it stands still when the motion mode is not "full" or while the scene is off-screen.
 */
const SPECKS = [
  { x: 6, s: 3, d: 15, w: 0 },
  { x: 13, s: 2, d: 19, w: 6 },
  { x: 21, s: 4, d: 17, w: 3 },
  { x: 29, s: 2, d: 22, w: 9 },
  { x: 37, s: 3, d: 16, w: 1 },
  { x: 44, s: 2, d: 20, w: 11 },
  { x: 52, s: 4, d: 18, w: 5 },
  { x: 59, s: 2, d: 14, w: 8 },
  { x: 66, s: 3, d: 21, w: 2 },
  { x: 73, s: 2, d: 17, w: 12 },
  { x: 80, s: 4, d: 19, w: 4 },
  { x: 87, s: 3, d: 15, w: 10 },
  { x: 93, s: 2, d: 23, w: 7 },
] as const;

interface Entry {
  key: string;
  to: string;
  label: string;
  icon: IconName;
  /** Small artwork shown before the label instead of the icon. */
  art?: string;
}

export function HomeIntro({ onContinue }: { onContinue: () => void }) {
  const { t } = useI18n();
  const root = useRef<HTMLElement>(null);

  // The backdrop only animates while the scene is on screen.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      el?.setAttribute('data-live', 'true');
      return;
    }
    const io = new IntersectionObserver(([e]) => el.setAttribute('data-live', String(Boolean(e?.isIntersecting))), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const entries: Entry[] = [
    { key: 'ai-games', to: '/ai-games', label: t('nav_ai_games'), icon: 'gamepad', art: assetUrl('images/games/chip-openai.webp') },
    { key: 'data-centers', to: '/data-centers', label: t('nav_data_centers'), icon: 'server' },
    { key: 'ai-news', to: '/explore', label: t('intro_link_news'), icon: 'sparkle' },
  ];

  return (
    <section ref={root} className="home-intro" aria-labelledby="home-title" data-live="true">
      <div className="hi-backdrop" aria-hidden="true">
        <span className="hi-glow hi-glow-a" />
        <span className="hi-glow hi-glow-b" />
        <span className="hi-glow hi-glow-c" />
        <span className="hi-grid" />
        <span className="hi-beam" />
        <span className="hi-specks">
          {SPECKS.map((p) => (
            <i key={p.x} style={{ '--x': `${p.x}%`, '--s': `${p.s}px`, '--d': `${p.d}s`, '--w': `-${p.w}s` } as CSSProperties} />
          ))}
        </span>
      </div>
      <div className="container hi-inner">
        <p className="hi-kicker">[ {t('intro_kicker')} ]</p>
        <h1 id="home-title" className="hi-title" lang="en" dir="ltr">
          FRONTIER
        </h1>
        <p className="hi-body">{t('intro_body')}</p>
        <nav className="hi-links" aria-label={t('intro_links')}>
          {entries.map((e) => (
            <a key={e.key} className="hi-link" href={href(e.to)} data-entry={e.key}>
              {e.art ? (
                <img className="hi-link-art" src={e.art} alt="" width={28} height={28} decoding="async" />
              ) : (
                <span className="hi-link-icon" aria-hidden="true">
                  <Icon name={e.icon} size={16} />
                </span>
              )}
              <span className="hi-link-label">{e.label}</span>
              <Icon name="arrow" size={14} directional />
            </a>
          ))}
        </nav>
        <p className="hi-meta">{t('intro_meta')}</p>
      </div>
      <button type="button" className="hi-scroll" onClick={onContinue}>
        <span>{t('intro_scroll')}</span>
        <Icon name="chevronDown" size={16} />
      </button>
    </section>
  );
}
