import { useId, useState, type KeyboardEvent } from 'react';
import { pickWindowLabel, useI18n } from '../lib/i18n';
import { useReveal, useSlidingIndicator } from '../lib/motion';
import { href } from '../lib/router';
import type { PicksFile, PickWindow } from '../lib/types';
import { Icon } from './Icon';
import { EmptyState } from './States';
import { StoryCard } from './StoryCard';

const WINDOWS: PickWindow[] = ['daily', 'weekly', 'monthly'];

export function PicksPanel({ picks, initial = 'daily', limit = 6, excludeIds }: { picks: PicksFile | null; initial?: PickWindow; limit?: number; excludeIds?: ReadonlySet<string> }) {
  const { t, locale } = useI18n();
  const [active, setActive] = useState<PickWindow>(initial);
  const base = useId();
  const track = useSlidingIndicator<HTMLDivElement>(active);
  const revealHead = useReveal<HTMLElement>('head');
  const entries = picks?.windows[active]?.picks.filter((p) => !excludeIds?.has(p.article.id)).slice(0, limit) ?? [];
  const [first, ...rest] = entries;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = WINDOWS.indexOf(active);
    const rtl = document.documentElement.dir === 'rtl';
    const next = e.key === (rtl ? 'ArrowLeft' : 'ArrowRight') ? 1 : e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') ? -1 : 0;
    if (!next) return;
    e.preventDefault();
    const w = WINDOWS[(idx + next + WINDOWS.length) % WINDOWS.length]!;
    setActive(w);
    document.getElementById(`${base}-tab-${w}`)?.focus();
  };

  const [second, third, ...more] = rest;

  return (
    <section className="picks" aria-labelledby={`${base}-h`} id="top-signals">
      <header ref={revealHead} className="section-head">
        <h2 id={`${base}-h`} className="section-title">
          <span className="section-glyph" aria-hidden="true">
            <Icon name="signal" size={22} />
          </span>
          {t('top_signals')}
        </h2>
        <div ref={track} className="tabs pill-track" role="tablist" aria-label={t('picks_window')}>
          {WINDOWS.map((w) => (
            <button
              key={w}
              id={`${base}-tab-${w}`}
              role="tab"
              type="button"
              className="tab"
              aria-selected={active === w}
              aria-controls={`${base}-panel`}
              tabIndex={active === w ? 0 : -1}
              onClick={() => setActive(w)}
              onKeyDown={onKey}
            >
              {t(`nav_${w}`)}
            </button>
          ))}
        </div>
        <a className="section-link" href={href('/picks/' + active)}>
          {t('view_all')} <Icon name="arrow" size={14} directional />
        </a>
      </header>
      <div key={active} id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`} className="picks-body swap-in">
        {!first ? (
          <EmptyState title={t('picks_empty')} />
        ) : (
          <>
            <div className="picks-grid">
              <StoryCard article={first.article} variant="feature" rank={first.rank} eagerImage headingLevel={3} />
              {(second || third) && (
                <div className="picks-secondary">
                  {[second, third].map(
                    (p) => p && <StoryCard key={p.article.id} article={p.article} variant="split" rank={p.rank} eagerImage headingLevel={3} />,
                  )}
                </div>
              )}
            </div>
            {more.length > 0 && (
              <div className="picks-more">
                <p className="picks-more-label">{t('also_ranking')}</p>
                <ol className="picks-list">
                  {more.map((p) => (
                    <li key={p.article.id}>
                      <StoryCard article={p.article} variant="row" rank={p.rank} headingLevel={3} />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
        <p className="picks-note">
          <Icon name="info" size={14} /> {t('picks_note')}{' '}
          <a href={href('/picks/' + active)}>
            {pickWindowLabel(locale, active)} <Icon name="arrow" size={14} directional />
          </a>
        </p>
      </div>
    </section>
  );
}
