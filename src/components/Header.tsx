import { useEffect, useState, type FormEvent } from 'react';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href, navigate, type Route } from '../lib/router';
import { CATEGORY_IDS } from '../lib/types';
import { Icon } from './Icon';

function isActive(route: Route, key: string): boolean {
  switch (key) {
    case 'home':
      return route.name === 'home';
    case 'picks':
      return route.name === 'picks';
    case 'explore':
      return route.name === 'explore';
    case 'archive':
      return route.name === 'archive' || route.name === 'day';
    default:
      return route.name === key;
  }
}

export function Header({ route }: { route: Route }) {
  const { t, locale, toggle } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const activeCategory = route.name === 'explore' ? route.params.get('c') : null;

  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    if (route.name === 'explore') setQ(route.params.get('q') ?? '');
  }, [route]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/explore', { q: q.trim() });
  };

  const links: { key: string; label: string; to: string }[] = [
    { key: 'home', label: t('nav_home'), to: '/' },
    { key: 'picks', label: t('nav_picks'), to: '/picks/daily' },
    { key: 'explore', label: t('nav_explore'), to: '/explore' },
    { key: 'archive', label: t('nav_archive'), to: '/archive' },
    { key: 'saved', label: t('nav_saved'), to: '/saved' },
    { key: 'about', label: t('nav_about'), to: '/about' },
  ];

  return (
    <header className="site-header">
      <div className="header-row container">
        <a className="wordmark" href={href('/')} aria-label="SIGNAL AI">
          <span className="wordmark-glyph" aria-hidden="true">
            <Icon name="pulse" size={20} />
          </span>
          <span className="wordmark-text" lang="en" dir="ltr">
            SIGNAL<span>AI</span>
          </span>
        </a>
        <nav className={`primary-nav ${open ? 'is-open' : ''}`} aria-label="Primary" id="primary-nav">
          <ul>
            {links.map((l) => (
              <li key={l.key}>
                <a href={href(l.to)} aria-current={isActive(route, l.key) ? 'page' : undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          {route.name === 'picks' || open ? (
            <ul className="sub-nav" aria-label={t('nav_picks')}>
              {(['daily', 'weekly', 'monthly'] as const).map((w) => (
                <li key={w}>
                  <a href={href(`/picks/${w}`)} aria-current={route.name === 'picks' && route.window === w ? 'page' : undefined}>
                    {t(`nav_${w}`)}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </nav>
        <form className="header-search" role="search" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="site-search">
            {t('search_label')}
          </label>
          <Icon name="search" size={16} />
          <input id="site-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nav_search')} autoComplete="off" />
        </form>
        <button type="button" className="lang-toggle" onClick={toggle} aria-label={t('lang_switch_label')} lang={locale === 'en' ? 'fa' : 'en'}>
          <Icon name="globe" size={16} />
          <span>{t('lang_switch')}</span>
        </button>
        <button type="button" className="menu-toggle icon-btn" aria-expanded={open} aria-controls="primary-nav" aria-label={t('nav_menu')} onClick={() => setOpen((o) => !o)}>
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
      <div className="category-row">
        <ul className="container category-list" aria-label={t('nav_categories')}>
          {CATEGORY_IDS.map((c) => (
            <li key={c}>
              <a href={href('/explore', { c })} aria-current={activeCategory === c ? 'page' : undefined}>
                {categoryLabel(locale, c)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
