import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { displayExcerpt, displayTitle, safeUrl, storyPath } from '../lib/article';
import { formatDateTime, formatNumber } from '../lib/dates';
import { genuineImage } from '../lib/heroStories';
import { useMediaQuery } from '../lib/hooks';
import { judgeHeroImage, rememberHeroFit, rememberedHeroFit, type HeroFit } from '../lib/imageFit';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { Article } from '../lib/types';
import { Icon } from './Icon';
import { resolveImageUrl } from './StoryImage';

/** Time each story stays on screen. */
export const SLIDE_MS = 5000;
const SWIPE_PX = 50;
/** The headline never shrinks below this share of its normal size; if the copy still does not fit, the hero grows instead of clipping it. */
const MIN_COPY_SCALE = 0.55;
const COPY_SCALE_STEP = 0.05;
/** The hero is never shorter than this, whatever the viewport. Keep in sync with `.nh-stage` in app.css. */
const MIN_STAGE_PX = 480;

interface SlideProps {
  story: Article;
  index: number;
  total: number;
  active: boolean;
  mountImage: boolean;
  /** The slide's layout changed (its image was judged), so the copy may need to be fitted again. */
  onLayout: () => void;
}

type SlideMode = 'art' | 'pending' | HeroFit;

function Slide({ story, index, total, active, mountImage, onLayout }: SlideProps) {
  const { t, locale } = useI18n();
  const title = displayTitle(story, locale);
  const excerpt = displayExcerpt(story, locale);
  const external = safeUrl(story.url);
  const src = resolveImageUrl(genuineImage(story)?.url);
  const [fit, setFit] = useState<HeroFit | 'pending'>(() => (src ? (rememberedHeroFit(src) ?? 'pending') : 'art'));
  const showImage = Boolean(src) && mountImage && fit !== 'art';
  // `pending`: the image is loading and is judged on arrival (cover, contain over a blurred copy, or dropped for the gradient backdrop).
  const mode: SlideMode = showImage ? fit : 'art';
  useEffect(() => onLayout(), [mode, onLayout]);
  const decide = (next: HeroFit) => {
    if (src) rememberHeroFit(src, next);
    setFit(next);
  };

  return (
    <div
      className={`nh-slide ${active ? 'is-active' : ''} is-${mode}`}
      role="group"
      aria-roledescription="slide"
      aria-label={t('hero_story', { n: index + 1, total })}
      aria-hidden={!active}
      inert={!active}
      data-testid="hero-slide"
      data-fit={mode}
    >
      {showImage && src && fit === 'contain' && <img className="nh-blur" src={src} alt="" aria-hidden="true" decoding="async" referrerPolicy="no-referrer" />}
      <div className="nh-inner container">
        <div className="nh-content">
          <p className="nh-cat">{categoryLabel(locale, story.category)}</p>
          <h2 className="nh-title" lang={title.lang} dir="auto">
            {title.text}
          </h2>
          {excerpt.text && (
            <p className="nh-desc" lang={excerpt.lang} dir="auto">
              {excerpt.text}
            </p>
          )}
          <p className="nh-meta">
            <span>{story.sourceName}</span>
            <span className="nh-sep" aria-hidden="true" />
            <time dateTime={story.publishedAt}>{formatDateTime(story.publishedAt, locale)}</time>
            {title.translated && (
              <>
                <span className="nh-sep" aria-hidden="true" />
                <span>{t('translation_machine')}</span>
              </>
            )}
          </p>
          <div className="nh-actions">
            <a className="btn is-primary is-lg nh-read" href={href(storyPath(story))}>
              <Icon name="book" size={18} />
              {t('hero_read')}
            </a>
            {external && (
              <a
                className="btn is-violet is-lg nh-source"
                href={external}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('read_source')}: ${story.sourceName}`}
              >
                {t('read_source')} <Icon name="external" size={15} />
              </a>
            )}
          </div>
        </div>
        {showImage && src && (
          <div className="nh-frame">
            <img
              className="nh-img"
              src={src}
              alt=""
              decoding="async"
              referrerPolicy="no-referrer"
              fetchPriority={index === 0 ? 'high' : 'auto'}
              onError={() => decide('art')}
              onLoad={(e) => decide(judgeHeroImage({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Shrinks each slide's headline just enough that its copy fits the first screen: the hero is at least as tall as the viewport below its own top
 * (the header, plus the mock-data banner in mock builds), the copy sits at its bottom, and nothing may poke out of the top. Each slide gets
 * `--nh-scale` (1 = normal size). Below MIN_COPY_SCALE the hero simply grows (the copy is never clipped and the title never gets an ellipsis).
 */
export function fitSlides(stage: HTMLElement, viewportH: number, top: number): void {
  const room = Math.max(MIN_STAGE_PX, viewportH - top);
  stage.querySelectorAll<HTMLElement>('.nh-slide').forEach((slide) => {
    const inner = slide.querySelector<HTMLElement>('.nh-inner');
    if (!inner) return;
    slide.style.removeProperty('--nh-scale');
    let scale = 1;
    while (scale > MIN_COPY_SCALE && inner.offsetHeight > room) {
      scale = Math.round((scale - COPY_SCALE_STEP) * 100) / 100;
      slide.style.setProperty('--nh-scale', String(scale));
    }
  });
}

/**
 * Full-bleed homepage carousel over real stories (see lib/heroStories.ts).
 * - Advances every SLIDE_MS with a crossfade, slow zoom and staged text; loops; any manual change restarts the timer.
 * - Pauses on hover, keyboard focus, hidden tab and off-screen; has an explicit pause button; autoplay is off under reduced motion.
 * - Dots, prev/next, arrow keys and touch swipe (direction follows RTL). Broken or tiny images fall back to the gradient backdrop.
 * - `stories === null` means loading; an empty list degrades to the brand intro.
 */
export function NewsHero({ stories }: { stories: Article[] | null }) {
  const { t, dir, locale } = useI18n();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const list = stories ?? [];
  const total = list.length;
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hover, setHover] = useState(false);
  const [focusIn, setFocusIn] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const dots = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const current = Math.min(index, Math.max(0, total - 1));
  const autoplay = total > 1 && (userPaused === null ? !reduced : !userPaused);
  const running = autoplay && !hover && !focusIn && onScreen && tabVisible;

  const relayout = useCallback(() => setLayoutTick((n) => n + 1), []);
  const fitCopy = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    // Where the hero starts on the page when scrolled to the top; the stage's CSS height reads it back as `--nh-top`.
    const top = Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
    el.style.setProperty('--nh-top', `${top}px`);
    fitSlides(el, window.innerHeight, top);
  }, []);
  useLayoutEffect(() => fitCopy(), [fitCopy, stories, locale, layoutTick]);
  useEffect(() => {
    let raf = 0;
    const again = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fitCopy);
    };
    window.addEventListener('resize', again);
    void document.fonts?.ready.then(again);
    return () => {
      window.removeEventListener('resize', again);
      cancelAnimationFrame(raf);
    };
  }, [fitCopy]);

  const setProgress = useCallback((p: number) => dots.current?.style.setProperty('--p', String(p)), []);

  const goTo = useCallback(
    (i: number) => {
      if (total === 0) return;
      const next = ((i % total) + total) % total;
      elapsed.current = 0;
      setProgress(autoplay ? 0 : 1);
      setIndex(next);
      setVisited((v) => (v.has(next) ? v : new Set(v).add(next)));
    },
    [total, autoplay, setProgress],
  );

  // Timer: counts visible, un-paused time so hover/pause resume where they stopped; a manual change zeroes it.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = -1;
    const tick = (now: number) => {
      // Real elapsed time (capped so a suspended page can't skip several slides at once).
      if (last >= 0) elapsed.current += Math.min(1000, Math.max(0, now - last));
      last = now;
      const p = Math.min(1, elapsed.current / SLIDE_MS);
      setProgress(p);
      if (p >= 1) goTo(current + 1);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, current, goTo, setProgress]);

  useEffect(() => {
    if (!autoplay) setProgress(1);
    else setProgress(Math.min(1, elapsed.current / SLIDE_MS));
  }, [autoplay, setProgress]);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(Boolean(e && e.intersectionRatio >= 0.35)), { threshold: [0, 0.35, 0.7] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const on = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  const step = (d: 1 | -1) => goTo(current + d);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (total < 2 || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const forward = (e.key === 'ArrowRight') === (dir !== 'rtl');
    step(forward ? 1 : -1);
    e.preventDefault();
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || total < 2) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    step((dir === 'rtl' ? dx > 0 : dx < 0) ? 1 : -1);
  };
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setFocusIn(false);
  };

  const loading = stories === null;
  const sub = t('hero_sub');
  const cut = sub.lastIndexOf(' ');
  const pad = (n: number) => (n < 10 ? formatNumber(0, locale) : '') + formatNumber(n, locale);
  // The brand line stays English in both locales. With stories on screen it is the page's h1 for assistive technology only.
  const brand = (
    <h1 className={total > 0 ? 'visually-hidden' : 'nh-brand'} id="hero-title" lang="en" dir="ltr">
      <span className="nh-brand-line">{t('hero_title')}</span>{' '}
      <span className="nh-brand-line">
        {cut > 0 ? sub.slice(0, cut + 1) : ''}
        <span className="nh-brand-accent">{cut > 0 ? sub.slice(cut + 1) : sub}</span>
      </span>
    </h1>
  );

  return (
    <section
      ref={root}
      className={`news-hero ${running ? '' : 'is-paused'}`}
      aria-roledescription={total > 0 ? 'carousel' : undefined}
      aria-label={t('hero_label')}
      aria-busy={loading}
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(false)}
      onFocus={(e) => setFocusIn(e.target.matches(':focus-visible'))} // keyboard focus pauses; a mouse click on a control does not
      onBlur={onBlur}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
    >
      <div ref={stage} className="nh-stage">
        <div className="nh-backdrop" aria-hidden="true" />
        {total > 0 && (
          <div className="nh-slides" aria-live={running ? 'off' : 'polite'}>
            {list.map((s, i) => (
              <Slide
                key={s.id}
                story={s}
                index={i}
                total={total}
                active={i === current}
                mountImage={visited.has(i) || i === (current + 1) % total}
                onLayout={relayout}
              />
            ))}
          </div>
        )}
        <div className="nh-scrim" aria-hidden="true" />

        {total === 0 ? (
          <div className="nh-inner nh-intro container">
            <div className="nh-content">
              <p className="nh-cat">{t('hero_kicker')}</p>
              {brand}
              {loading ? (
                <p className="visually-hidden" role="status">
                  {t('hero_loading')}
                </p>
              ) : (
                <p className="nh-desc">{t('hero_body')}</p>
              )}
            </div>
          </div>
        ) : (
          brand
        )}

        {total > 0 && (
          <div className="nh-controls container">
            <div className="nh-dots" ref={dots} role="group" aria-label={t('hero_label')}>
              {list.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="nh-dot"
                  aria-label={t('hero_story', { n: i + 1, total })}
                  aria-current={i === current ? 'true' : undefined}
                  onClick={() => goTo(i)}
                >
                  <span className="nh-dot-bar">
                    <span className="nh-dot-fill" />
                  </span>
                </button>
              ))}
            </div>
            <div className="nh-nav">
              <span className="nh-count" aria-hidden="true">
                {pad(current + 1)} <span>/ {pad(total)}</span>
              </span>
              {total > 1 && (
                <>
                  <button type="button" className="nh-btn nh-prev" aria-label={t('hero_prev')} onClick={() => step(-1)}>
                    <Icon name="arrow" size={18} back />
                  </button>
                  <button type="button" className="nh-btn nh-next" aria-label={t('hero_next')} onClick={() => step(1)}>
                    <Icon name="arrow" size={18} directional />
                  </button>
                  <button
                    type="button"
                    className="nh-btn nh-toggle"
                    aria-label={autoplay ? t('hero_slides_pause') : t('hero_slides_play')}
                    aria-pressed={!autoplay}
                    onClick={() => {
                      setUserPaused(autoplay);
                    }}
                  >
                    <Icon name={autoplay ? 'pause' : 'play'} size={14} filled />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
