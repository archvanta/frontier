import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import type { Article, SectionId } from '../lib/types';
import { href } from '../lib/router';
import { Icon } from './Icon';
import { StoryCard } from './StoryCard';

/**
 * A horizontal row of story tiles instead of a long column: the first story is large and outlined, the next ones peek in from the side.
 * Native scroll snapping does the moving (touch, trackpad, keyboard arrows on the focused row); the arrows and dots are shortcuts on top.
 * It works the same in RTL: the row starts at the right and the "next" arrow scrolls toward the left.
 */
export function Carousel({
  title,
  seeAllTo,
  articles,
  section,
  tone,
}: {
  title: string;
  seeAllTo: string;
  articles: Article[];
  section?: SectionId;
  tone?: string;
}) {
  const { t, locale } = useI18n();
  const headingId = useId();
  const track = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({
    pages: 1,
    page: 0,
    atStart: true,
    atEnd: true,
  });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 1) {
      setState((s) => (s.pages === 1 && s.atStart && s.atEnd ? s : { pages: 1, page: 0, atStart: true, atEnd: true }));
      return;
    }
    // scrollLeft is negative in RTL, so only its distance from the start matters.
    const at = Math.abs(el.scrollLeft);
    const pages = Math.max(2, Math.ceil(el.scrollWidth / el.clientWidth));
    const page = Math.min(pages - 1, Math.round((at / max) * (pages - 1)));
    const next = { pages, page, atStart: at <= 1, atEnd: at >= max - 1 };
    setState((s) => (s.pages === next.pages && s.page === next.page && s.atStart === next.atStart && s.atEnd === next.atEnd ? s : next));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, [measure, articles.length]);

  const behavior = (): ScrollBehavior => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollBy({
      left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.85,
      behavior: behavior(),
    });
  };
  const toPage = (p: number) => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const rtl = getComputedStyle(el).direction === 'rtl';
    const left = (p / Math.max(1, state.pages - 1)) * max;
    el.scrollTo({ left: rtl ? -left : left, behavior: behavior() });
  };

  if (articles.length === 0) return null;
  return (
    <section className="carousel" aria-labelledby={headingId} data-section={section} data-tone={tone}>
      <header className="carousel-head">
        <h2 id={headingId} className="section-title carousel-title">
          {title}
        </h2>
        <a className="carousel-all" href={href(seeAllTo)}>
          {t('carousel_see_all')} <Icon name="arrow" size={14} directional />
        </a>
      </header>
      <div className="carousel-stage">
        <ul ref={track} className="carousel-track" tabIndex={0} aria-label={title}>
          {articles.map((a, i) => (
            <li key={a.id} className={`carousel-item ${i === 0 ? 'is-lead' : ''}`}>
              <StoryCard article={a} variant="tile" timeOnly={false} headingLevel={3} still />
            </li>
          ))}
        </ul>
        <button type="button" className="carousel-arrow is-prev" onClick={() => step(-1)} disabled={state.atStart} aria-label={t('carousel_prev')}>
          <Icon name="arrow" back size={18} />
        </button>
        <button type="button" className="carousel-arrow is-next" onClick={() => step(1)} disabled={state.atEnd} aria-label={t('carousel_next')}>
          <Icon name="arrow" directional size={18} />
        </button>
      </div>
      {state.pages > 1 && (
        <div className="carousel-dots" role="group" aria-label={title}>
          {Array.from({ length: state.pages }, (_, p) => (
            <button
              key={p}
              type="button"
              className="carousel-dot"
              aria-current={p === state.page ? 'true' : undefined}
              aria-label={t('carousel_page', {
                n: formatNumber(p + 1, locale),
                m: formatNumber(state.pages, locale),
              })}
              onClick={() => toPage(p)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
