import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { displayTitle, storyPath } from '../lib/article';
import { relativeTime } from '../lib/dates';
import { useMediaQuery } from '../lib/hooks';
import { useReveal } from '../lib/motion';
import { judgeCardImage, rememberCardFit, rememberedCardFit } from '../lib/imageFit';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import { toneFor } from '../lib/tones';
import type { Article } from '../lib/types';
import { Icon } from './Icon';
import { Marquee } from './Marquee';
import { fallbackFor, resolveImageUrl } from './StoryImage';

const COLUMNS = 4;
const MAX_STORIES = 24;
/** Fewer stories than this and the drifting columns would just repeat themselves, so a quiet grid is shown instead. */
const MIN_FOR_MOTION = 6;
const DURATIONS = [46, 58, 40, 52];

/** Small square thumbnail filled by the photo; a photo that is tiny or broken is left out and the text fills the card. */
function Thumb({ story }: { story: Article }) {
  const own = story.image?.kind === 'fallback' ? null : resolveImageUrl(story.image?.url);
  const [hidden, setHidden] = useState(() => Boolean(own) && rememberedCardFit(own!) === 'hide');
  if (hidden) return null;
  return (
    <span className="wall-thumb">
      <img
        src={own ?? fallbackFor(story.category)}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        width={96}
        height={96}
        onLoad={(e) => {
          if (!own) return;
          const fit = judgeCardImage({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight });
          rememberCardFit(own, fit);
          if (fit === 'hide') setHidden(true);
        }}
        onError={() => setHidden(true)}
      />
    </span>
  );
}

/** `decorative` copies are plain boxes; `quiet` links stay clickable but leave the tab order. */
function WallCard({ story, now, decorative = false, quiet = false }: { story: Article; now: Date; decorative?: boolean; quiet?: boolean }) {
  const { locale } = useI18n();
  const title = displayTitle(story, locale);
  const body = (
    <>
      <Thumb story={story} />
      <span className="wall-text">
        <span className="wall-cat">{categoryLabel(locale, story.category)}</span>
        <span className="wall-title" lang={title.lang} dir="auto">
          {title.text}
        </span>
        <span className="wall-meta">
          {story.sourceName} · {relativeTime(story.publishedAt, now, locale)}
        </span>
      </span>
    </>
  );
  return decorative ? (
    <div className="wall-card" data-tone={toneFor(story.category)}>
      {body}
    </div>
  ) : (
    <a className="wall-card" data-tone={toneFor(story.category)} href={href(storyPath(story))} tabIndex={quiet ? -1 : undefined} data-testid="wall-card">
      {body}
    </a>
  );
}

/**
 * "Signal wall": the newest real headlines in tilted, drifting columns (the 3D marquee).
 * The moving wall repeats stories that are listed in full below, so it is hidden from assistive technology and its links leave the tab order;
 * under reduced motion, or with too few stories, a plain grid of real links replaces it.
 */
export function SignalWall({ stories, now }: { stories: Article[]; now: Date }) {
  const { t } = useI18n();
  const headingId = useId();
  const revealHead = useReveal<HTMLElement>('head');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const stage = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const list = useMemo(() => stories.slice(0, MAX_STORIES), [stories]);
  const moving = !reduced && list.length >= MIN_FOR_MOTION;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOnScreen(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setOnScreen(Boolean(e?.isIntersecting)), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [moving]);

  useEffect(() => {
    const on = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  if (list.length < 4) return null;
  const columns = Array.from({ length: COLUMNS }, (_, c) => list.filter((_, i) => i % COLUMNS === c));

  return (
    <section className="signal-wall" aria-labelledby={headingId} data-testid="signal-wall">
      <header ref={revealHead} className="section-head">
        <h2 id={headingId} className="section-title">
          <span className="section-glyph" aria-hidden="true">
            <Icon name="pulse" size={22} />
          </span>
          {t('wall_title')}
        </h2>
        <p className="section-sub">{t('wall_sub')}</p>
      </header>
      {moving ? (
        <div ref={stage} className="wall-stage" aria-hidden="true">
          <div className="wall-plane">
            {columns.map((col, c) => (
              <Marquee
                key={c}
                vertical
                reverse={c % 2 === 1}
                pauseOnHover
                paused={!onScreen || !tabVisible}
                duration={DURATIONS[c]}
                repeat={Math.max(2, Math.ceil(1800 / (col.length * 116)))}
                className="wall-col"
              >
                {(decorative) => col.map((s) => <WallCard key={s.id} story={s} now={now} decorative={decorative} quiet />)}
              </Marquee>
            ))}
          </div>
          <div className="wall-fade" />
        </div>
      ) : (
        <div className="wall-static" aria-label={t('wall_label')}>
          {list.slice(0, 8).map((s) => (
            <WallCard key={s.id} story={s} now={now} decorative={false} />
          ))}
        </div>
      )}
    </section>
  );
}
