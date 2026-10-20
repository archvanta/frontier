import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import { categoryDescription, categoryLabel, useI18n } from '../lib/i18n';
import { DUR, runTransition, usePresence, useSlidingIndicator } from '../lib/motion';
import { href, navigate, type Route } from '../lib/router';
import { useTheme } from '../lib/theme';
import { toneFor, categoryIcon, type Tone } from '../lib/tones';
import { CATEGORY_IDS, type Locale } from '../lib/types';
import { UserMenu } from './account/UserMenu';
import { Icon, type IconName } from './Icon';

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

/** The FRONTIER mark: a rising line breaking past a horizon. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19h16" />
      <path d="M6 15l4.5-4.5 3 3L19 8" />
      <path d="M15 8h4v4" />
    </svg>
  );
}

export function Wordmark() {
  const { t } = useI18n();
  return (
    <a className="wordmark" href={href('/')} aria-label={t('brand')}>
      <span className="wordmark-glyph" aria-hidden="true">
        <BrandMark />
      </span>
      <span className="wordmark-text" lang="en" dir="ltr">
        FRONTIER
      </span>
    </a>
  );
}

/** FA / EN segmented switch. Each button names its language in both scripts. */
export function LangSwitch() {
  const { locale, setLocale } = useI18n();
  const track = useSlidingIndicator<HTMLDivElement>(locale);
  const options: { id: Locale; short: string; label: string }[] = [
    { id: 'fa', short: 'FA', label: 'فارسی (Persian)' },
    { id: 'en', short: 'EN', label: 'English (انگلیسی)' },
  ];
  return (
    <div ref={track} className="lang-switch" role="group" aria-label="Language / زبان">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="lang-option"
          aria-pressed={locale === o.id}
          aria-label={o.label}
          title={o.label}
          lang={o.id}
          onClick={() => locale !== o.id && setLocale(o.id)}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}

/** Dark / light switch. The icon shows the theme a click switches to; the choice is saved and applied before first paint. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggle } = useTheme();
  const toLight = theme === 'dark';
  const label = toLight ? t('theme_to_light') : t('theme_to_dark');
  return (
    <button type="button" className="theme-toggle" aria-label={label} title={label} data-theme-current={theme} onClick={() => runTransition(toggle, 'theme')}>
      <Icon name={toLight ? 'sun' : 'moon'} size={18} />
    </button>
  );
}

interface MenuItem {
  key: string;
  to: string;
  icon: IconName;
  tone: Tone;
  title: string;
  desc: string;
  current: boolean;
  params?: Record<string, string>;
}

interface MenuGroup {
  id: string;
  label: string;
  current: boolean;
  items: MenuItem[];
}

/** One drop-down: a disclosure button plus a panel of rows (icon tile, title, one-line description). */
function NavGroup({ group, open, onToggle, onClose }: { group: MenuGroup; open: boolean; onToggle: (id: string | null) => void; onClose: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);
  const panelId = `nav-panel-${group.id}`;
  // The panel stays mounted briefly after closing so it can animate out; it is inert meanwhile.
  const { mounted, closing } = usePresence(open, DUR.press);

  const links = () => Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
  const focusAt = (i: number) => {
    const all = links();
    all[(i + all.length) % all.length]?.focus();
  };

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    onToggle(group.id);
    // The panel mounts on the next render; focus its first row once it exists.
    window.setTimeout(() => focusAt(0), 0);
  };

  const onPanelKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown') focusAt(at + 1);
    else if (e.key === 'ArrowUp') focusAt(at - 1);
    else if (e.key === 'Home') focusAt(0);
    else if (e.key === 'End') focusAt(all.length - 1);
    else if (e.key === 'Escape') {
      onClose();
      trigger.current?.focus();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const onBlur = (e: FocusEvent<HTMLLIElement>) => {
    if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) onClose();
  };

  return (
    <li className={`nav-item ${open ? 'is-open' : ''}`} data-nav-group={group.id} onBlur={onBlur}>
      <button
        ref={trigger}
        type="button"
        className={`nav-trigger ${group.current ? 'is-current' : ''}`}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => onToggle(open ? null : group.id)}
        onKeyDown={onTriggerKey}
      >
        {group.label}
        <Icon name="chevronDown" size={14} />
      </button>
      {mounted && (
        <ul
          ref={panel}
          id={panelId}
          className="nav-panel"
          data-state={closing ? 'closing' : 'open'}
          inert={closing}
          aria-label={group.label}
          onKeyDown={onPanelKey}
        >
          {group.items.map((it) => (
            <li key={it.key}>
              <a className="nav-row" href={href(it.to, it.params)} aria-current={it.current ? 'page' : undefined}>
                <span className="nav-tile" data-tone={it.tone} aria-hidden="true">
                  <Icon name={it.icon} size={18} />
                </span>
                <span className="nav-row-text">
                  <span className="nav-row-title">{it.title}</span>
                  <span className="nav-row-desc">{it.desc}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function Header({ route }: { route: Route }) {
  const { t, locale } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobile = usePresence(mobileOpen, DUR.press);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const bar = useRef<HTMLElement>(null);
  const activeCategory = route.name === 'explore' ? route.params.get('c') : null;

  useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [route]);
  useEffect(() => {
    if (route.name === 'explore') setQ(route.params.get('q') ?? '');
  }, [route]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const anyOpen = mobileOpen || openGroup !== null;
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && anyOpen) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTyping(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (anyOpen && bar.current && !bar.current.contains(e.target as Node)) {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [anyOpen]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate('/explore', { q: q.trim() });
  };

  const picks: MenuGroup = {
    id: 'picks',
    label: t('nav_picks'),
    current: isActive(route, 'picks'),
    items: [
      {
        key: 'daily',
        to: '/picks/daily',
        icon: 'sun',
        tone: 'blue',
        title: t('nav_daily'),
        desc: t('menu_daily_d'),
        current: route.name === 'picks' && route.window === 'daily',
      },
      {
        key: 'weekly',
        to: '/picks/weekly',
        icon: 'calendar',
        tone: 'violet',
        title: t('nav_weekly'),
        desc: t('menu_weekly_d'),
        current: route.name === 'picks' && route.window === 'weekly',
      },
      {
        key: 'monthly',
        to: '/picks/monthly',
        icon: 'layers',
        tone: 'teal',
        title: t('nav_monthly'),
        desc: t('menu_monthly_d'),
        current: route.name === 'picks' && route.window === 'monthly',
      },
    ],
  };
  const categories: MenuGroup = {
    id: 'categories',
    label: t('nav_categories'),
    current: activeCategory !== null,
    items: CATEGORY_IDS.map((c) => ({
      key: c,
      to: '/explore',
      params: { c },
      icon: categoryIcon(c),
      tone: toneFor(c),
      title: categoryLabel(locale, c),
      desc: categoryDescription(locale, c),
      current: activeCategory === c,
    })),
  };
  const more: MenuGroup = {
    id: 'more',
    label: t('nav_more'),
    current: isActive(route, 'archive') || route.name === 'sources' || route.name === 'about',
    items: [
      {
        key: 'archive',
        to: '/archive',
        icon: 'archive',
        tone: 'indigo',
        title: t('nav_archive'),
        desc: t('menu_archive_d'),
        current: isActive(route, 'archive'),
      },
      { key: 'sources', to: '/sources', icon: 'rss', tone: 'teal', title: t('nav_sources'), desc: t('menu_sources_d'), current: route.name === 'sources' },
      { key: 'about', to: '/about', icon: 'book', tone: 'crimson', title: t('nav_about'), desc: t('menu_about_d'), current: route.name === 'about' },
    ],
  };

  const group = (g: MenuGroup) => <NavGroup key={g.id} group={g} open={openGroup === g.id} onToggle={setOpenGroup} onClose={() => setOpenGroup(null)} />;

  return (
    <header ref={bar} className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-bar">
        <Wordmark />
        <nav className={`primary-nav ${mobile.mounted ? 'is-open' : ''} ${mobile.closing ? 'is-closing' : ''}`} aria-label="Primary" id="primary-nav">
          <ul className="nav-list">
            <li className="nav-item">
              <a className="nav-link" href={href('/')} aria-current={isActive(route, 'home') ? 'page' : undefined}>
                {t('nav_home')}
              </a>
            </li>
            {group(picks)}
            {group(categories)}
            <li className="nav-item">
              <a className="nav-link" href={href('/explore')} aria-current={route.name === 'explore' && !activeCategory ? 'page' : undefined}>
                {t('nav_explore')}
              </a>
            </li>
            {group(more)}
            <li className="nav-item nav-mobile-only">
              <a className="nav-link" href={href('/saved')} aria-current={route.name === 'saved' ? 'page' : undefined}>
                {t('nav_saved')}
              </a>
            </li>
          </ul>
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
          <ThemeToggle />
          <UserMenu route={route} />
          <a className="btn is-primary header-cta" href={href('/saved')} aria-current={route.name === 'saved' ? 'page' : undefined}>
            <Icon name="bookmark" size={16} />
            {t('nav_saved')}
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={mobileOpen}
            aria-controls="primary-nav"
            aria-label={t('nav_menu')}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>
    </header>
  );
}
