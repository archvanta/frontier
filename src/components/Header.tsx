import { useEffect, useRef, useState, type FormEvent } from 'react';
import { categoryLabel, useI18n } from '../lib/i18n';
import { href, navigate, type Route } from '../lib/router';
import { CATEGORY_IDS, type Locale } from '../lib/types';
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

/** True while the user is typing somewhere, so the "/" search shortcut never steals a keystroke. */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

export function Wordmark() {
  return (
    <a className="wordmark" href={href('/')} aria-label="SIGNAL AI">
      <span className="wordmark-glyph" aria-hidden="true">
        <Icon name="signal" size={26} />
      </span>
      <span className="wordmark-text" lang="en" dir="ltr">
        SIGNAL<span>AI</span>
      </span>
    </a>
  );
}

/** FA / EN segmented switch. Each button names its language in both scripts. */
export function LangSwitch() {
  const { locale, setLocale } = useI18n();
  const options: { id: Locale; short: string; label: string }[] = [
    { id: 'fa', short: 'FA', label: 'فارسی (Persian)' },
    { id: 'en', short: 'EN', label: 'English (انگلیسی)' },
  ];
  return (
    <div className="lang-switch" role="group" aria-label="Language / زبان">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="lang-option"
          aria-pressed={locale === o.id}
          aria-label={o.label}
          title={o.label}
          lang={o.id}
          onClick={() => setLocale(o.id)}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}

export function Header({ route }: { route: Route }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const activeCategory = route.name === 'explore' ? route.params.get('c') : null;

  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    if (route.name === 'explore') setQ(route.params.get('q') ?? '');
  }, [route]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

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
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container">
        <div className="header-bar glass">
          <Wordmark />
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
            {open && (
              <ul className="menu-categories" aria-label={t('nav_categories')}>
                {CATEGORY_IDS.map((c) => (
                  <li key={c}>
                    <a className="chip" href={href('/explore', { c })} aria-current={activeCategory === c ? 'page' : undefined}>
                      {categoryLabel(locale, c)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <div className="header-actions">
            <form className="header-search" role="search" onSubmit={submit}>
              <label className="visually-hidden" htmlFor="site-search">
                {t('search_label')}
              </label>
              <Icon name="search" size={16} />
              <input
                ref={searchRef}
                id="site-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('nav_search')}
                autoComplete="off"
                aria-keyshortcuts="/"
              />
              <kbd className="search-kbd" title={t('search_shortcut')} aria-hidden="true">
                /
              </kbd>
            </form>
            <LangSwitch />
            <button
              type="button"
              className="menu-toggle icon-btn"
              aria-expanded={open}
              aria-controls="primary-nav"
              aria-label={t('nav_menu')}
              onClick={() => setOpen((o) => !o)}
            >
              <Icon name={open ? 'close' : 'menu'} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
