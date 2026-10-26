import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { displayExcerpt, displayTitle, safeUrl, storyPath } from '../lib/article';
import { formatDateTime, formatNumber } from '../lib/dates';
import { genuineImage } from '../lib/heroStories';
import { useMediaQuery } from '../lib/hooks';
import { judgeBackgroundImage, judgeCardImage, rememberBackground, rememberCardFit, rememberedBackground, rememberedCardFit } from '../lib/imageFit';
import { categoryLabel, useI18n } from '../lib/i18n';
import { iconArt } from '../lib/iconArt';
import { href } from '../lib/router';
import type { Article } from '../lib/types';
import { Icon } from './Icon';
import { StoryCard } from './StoryCard';
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
}

/**
 * One fixed template for every story: the copy on the start side and a rounded frame of one fixed size on the end side (stacked above the copy
 * on phones), filled edge to edge by the story's photo. A story without a usable photo (none, broken or tiny) keeps the same frame with a quiet
 * gradient and its category icon, so the layout never changes from one story to the next.
 * Only the layer behind the template differs: a photo that is big and landscape enough (see judgeBackgroundImage) also fills the slide's
 * background under a dark gradient on the copy side; any other story keeps the plain gradient. The background reuses the frame photo's URL, so
 * the browser fetches it once, and it is judged when the (pre-mounted) frame photo loads, before its slide is shown.
 */
function Slide({ story, index, total, active, mountImage }: SlideProps) {
  const { t, locale } = useI18n();
  const title = displayTitle(story, locale);
  const excerpt = displayExcerpt(story, locale);
  const external = safeUrl(story.url);
  const src = resolveImageUrl(genuineImage(story)?.url);
  const [broken, setBroken] = useState(() => Boolean(src) && rememberedCardFit(src!) === 'hide');
  const [bgOk, setBgOk] = useState(() => Boolean(src) && rememberedBackground(src!) === true);
  const [bgLoaded, setBgLoaded] = useState(false);
  const showImage = Boolean(src) && mountImage && !broken;
  const showBackground = showImage && bgOk;
  const drop = () => {
    if (src) rememberCardFit(src, 'hide');
    setBroken(true);
  };

  return (
    <div
      className={`nh-slide ${active ? 'is-active' : ''}`}
      role="group"
      aria-roledescription="slide"
      aria-label={t('hero_story', { n: index + 1, total })}
      aria-hidden={!active}
      inert={!active}
      data-testid="hero-slide"
      data-photo={showImage ? 'yes' : 'no'}
      data-bg={showBackground ? 'yes' : 'no'}
    >
      {showBackground && src && (
        <div className="nh-bg" aria-hidden="true">
          <img
            className={`nh-bg-img ${bgLoaded ? 'is-loaded' : ''}`}
            src={src}
            alt=""
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setBgLoaded(true)}
            onError={() => setBgOk(false)}
          />
        </div>
      )}
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
        <div className={`nh-frame ${showImage ? '' : 'is-empty'}`} aria-hidden="true">
          {showImage && src ? (
            <img
              className="nh-img"
              src={src}
              alt=""
              decoding="async"
              referrerPolicy="no-referrer"
              fetchPriority={index === 0 ? 'high' : 'auto'}
              onError={drop}
              onLoad={(e) => {
                const fit = judgeCardImage({
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                });
                rememberCardFit(src, fit);
                const bg =
                  fit === 'ok' &&
                  judgeBackgroundImage({
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight,
                  });
                rememberBackground(src, bg);
                setBgOk(bg);
                if (fit === 'hide') setBroken(true);
              }}
            />
          ) : (
            <img
              className="nh-fallback-art"
              src={iconArt(story.category)}
              alt=""
              width={280}
              height={280}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
          )}
        </div>
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
  // The stage pads its two frames; the slider frame is that much shorter than the stage.
  const cs = getComputedStyle(stage);
  const pad = (parseFloat(cs.paddingBlockStart) || 0) + (parseFloat(cs.paddingBlockEnd) || 0);
  const room = Math.max(MIN_STAGE_PX, viewportH - top) - pad;
  stage.querySelectorAll<HTMLElement>('.nh-slide').forEach((slide) => {
    const inner = slide.querySelector<HTMLElement>('.nh-inner');
    if (!inner) return;
    slide.style.removeProperty('--nh-scale');
    // The template stretches to fill the slide; measure its natural height instead.
    // No transition while measuring: a transitioning `flex` would keep reporting the stretched size.
    inner.style.transition = 'none';
    inner.style.flex = 'none';
    let scale = 1;
    while (scale > MIN_COPY_SCALE && inner.offsetHeight > room) {
      scale = Math.round((scale - COPY_SCALE_STEP) * 100) / 100;
      slide.style.setProperty('--nh-scale', String(scale));
    }
    inner.style.removeProperty('flex');
    void inner.offsetHeight;
    inner.style.removeProperty('transition');
  });
}

/**
 * (`standalone: false` when the page already has its own heading and intro: no h1 and no brand copy, only the carousel.)
 * Full-width homepage carousel over real stories (see lib/heroStories.ts), every story in the same fixed template (see Slide).
 * - Advances every SLIDE_MS with a crossfade and staged text; loops; any manual change restarts the timer.
 * - Never stops for the mouse or for focus: every story leaves after SLIDE_MS. It waits only while the tab is hidden or the hero is off-screen,
 *   has an explicit pause button, and autoplay is off under reduced motion.
 * - Dots, prev/next, arrow keys and touch swipe (direction follows RTL). Broken or tiny images leave the frame with its placeholder.
 * - `stories === null` means loading; an empty list degrades to the brand intro.
 */
export function NewsHero({ stories, standalone = true }: { stories: Article[] | null; standalone?: boolean }) {
  const { t, dir, locale } = useI18n();
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const list = stories ?? [];
  const total = list.length;
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  // The standalone news page loads its hero immediately. On the homepage the hero sits below the
  // intro, so wait until it actually enters view before requesting large third-party story photos.
  const [onScreen, setOnScreen] = useState(standalone);
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const current = Math.min(index, Math.max(0, total - 1));
  const autoplay = total > 1 && (userPaused === null ? !reduced : !userPaused);
  const running = autoplay && onScreen && tabVisible;

  // The side card shows the story that comes next, so the reader sees what is queued behind the one on screen.
  const sideIndex = total > 1 ? (current + 1) % total : -1;
  const side = sideIndex >= 0 ? list[sideIndex]! : null;

  const fitCopy = useCallback(() => {
    const el = stage.current;
    if (!el) return;
    // The hero is a full screen of its own below the intro: it fills the viewport under the sticky header (`--nh-top` is the header's height).
    const top = document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
    el.style.setProperty('--nh-top', `${top}px`);
    fitSlides(el, window.innerHeight, top);
  }, []);
  useLayoutEffect(() => fitCopy(), [fitCopy, stories, locale]);
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

  // Timer: counts visible, un-paused time so the pause button and scrolling away resume where they stopped; a manual change zeroes it.
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

  const loading = stories === null;
  const sub = t('hero_sub');
  const cut = sub.lastIndexOf(' ');
  const pad = (n: number) => (n < 10 ? formatNumber(0, locale) : '') + formatNumber(n, locale);
  // The brand line stays English in both locales. With stories on screen it is the page's h1 for assistive technology only.
  const brand = !standalone ? null : (
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
      id="news-hero"
      tabIndex={-1}
      className={`news-hero ${running ? '' : 'is-paused'}`}
      aria-roledescription={total > 0 ? 'carousel' : undefined}
      aria-label={t('hero_label')}
      aria-busy={loading}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
    >
      <div ref={stage} className={`nh-stage ${side ? 'has-side' : ''}`}>
        <div className="nh-main">
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
                  mountImage={(standalone || onScreen) && (visited.has(i) || i === (current + 1) % total)}
                />
              ))}
            </div>
          )}
          <div className="nh-scrim" aria-hidden="true" />

          {total === 0 ? (
            <div className="nh-inner nh-intro container">
              <div className="nh-content">
                {standalone && <p className="nh-cat">{t('hero_kicker')}</p>}
                {brand}
                {loading ? (
                  <p className="visually-hidden" role="status">
                    {t('hero_loading')}
                  </p>
                ) : (
                  standalone && <p className="nh-desc">{t('hero_body')}</p>
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
        {side && (
          <aside className="nh-side" aria-label={t('hero_up_next')}>
            <StoryCard key={side.id} article={side} variant="split" rank={sideIndex + 1} tone="crimson" still eagerImage headingLevel={3} />
          </aside>
        )}
      </div>
    </section>
  );
}
