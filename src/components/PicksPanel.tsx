import { useId, useState, type KeyboardEvent } from 'react';
import { pickWindowLabel, useI18n } from '../lib/i18n';
import { href } from '../lib/router';
import type { PicksFile, PickWindow } from '../lib/types';
import { Icon } from './Icon';
import { EmptyState } from './States';
import { StoryCard } from './StoryCard';

const WINDOWS: PickWindow[] = ['daily', 'weekly', 'monthly'];

export function PicksPanel({ picks, initial = 'daily', limit = 6 }: { picks: PicksFile | null; initial?: PickWindow; limit?: number }) {
  const { t, locale } = useI18n();
  const [active, setActive] = useState<PickWindow>(initial);
  const base = useId();
  const entries = picks?.windows[active]?.picks.slice(0, limit) ?? [];
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

  return (
    <section className="picks" aria-labelledby={`${base}-h`} id="top-signals">
      <header className="section-head">
        <h2 id={`${base}-h`} className="section-title">
          <span className="section-dot" aria-hidden="true" />
          {t('top_signals')}
        </h2>
        <div className="tabs" role="tablist" aria-label={t('picks_window')}>
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
      </header>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${active}`} className="picks-body">
        {!first ? (
          <EmptyState title={t('picks_empty')} />
        ) : (
          <div className="picks-grid">
            <StoryCard article={first.article} variant="feature" rank={first.rank} eagerImage headingLevel={3} />
            <ol className="picks-list">
              {rest.map((p) => (
                <li key={p.article.id}>
                  <StoryCard article={p.article} variant="row" rank={p.rank} headingLevel={3} />
                </li>
              ))}
            </ol>
          </div>
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
