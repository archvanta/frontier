import { useEffect, useMemo, useState } from 'react';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { EmptyState } from './components/States';
import { createDataSource, type DataSource } from './lib/data';
import { DataProvider } from './lib/dataContext';
import { focusSection } from './lib/focus';
import { useAsync } from './lib/hooks';
import { useI18n } from './lib/i18n';
import { href, parseHash, useHash, type Route } from './lib/router';
import { AboutPage } from './pages/AboutPage';
import { ArchivePage, DayPage } from './pages/ArchivePage';
import { ExplorePage } from './pages/ExplorePage';
import { HomePage } from './pages/HomePage';
import { PicksPage } from './pages/PicksPage';
import { SavedPage } from './pages/SavedPage';
import { SourcesPage } from './pages/SourcesPage';
import { StoryPage } from './pages/StoryPage';

function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function Page({ route, now, meta, heroSlot }: { route: Route; now: Date; meta: import('./lib/types').Meta | null; heroSlot: HTMLElement | null }) {
  const { t } = useI18n();
  switch (route.name) {
    case 'home':
      return <HomePage page={route.page} meta={meta} now={now} heroSlot={heroSlot} />;
    case 'picks':
      return <PicksPage window={route.window} />;
    case 'explore':
      return <ExplorePage params={route.params} />;
    case 'archive':
      return <ArchivePage />;
    case 'day':
      return <DayPage day={route.day} />;
    case 'story':
      return <StoryPage day={route.day} id={route.id} />;
    case 'saved':
      return <SavedPage />;
    case 'about':
      return <AboutPage />;
    case 'sources':
      return <SourcesPage />;
    default:
      return (
        <div className="page container-narrow">
          <h1 className="page-title">{t('not_found')}</h1>
          <EmptyState title={t('not_found')}>
            <a className="btn" href={href('/')}>
              {t('go_home')}
            </a>
          </EmptyState>
        </div>
      );
  }
}

export function App({ source }: { source?: DataSource }) {
  const data = useMemo(() => source ?? createDataSource(), [source]);
  const { t } = useI18n();
  const hash = useHash();
  const route = useMemo(() => parseHash(hash), [hash]);
  const now = useNow();
  const [heroSlot, setHeroSlot] = useState<HTMLElement | null>(null);
  const meta = useAsync(() => data.meta(), [data]);

  useEffect(() => {
    if (route.name !== 'home' || route.page !== 1) window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <DataProvider source={data}>
      <button type="button" className="skip-link" onClick={() => focusSection('main')}>
        {t('skipToContent')}
      </button>
      {data.mode === 'mock' && (
        <p className="mock-banner" role="note">
          {t('mock_banner')}
        </p>
      )}
      <Header route={route} />
      <main id="main">
        {/* Edge-to-edge slot for the homepage hero, which lives outside the width-limited column. */}
        <div ref={setHeroSlot} className="hero-slot" />
        <div className="container site-main">
          <Page route={route} now={now} meta={meta.status === 'ready' ? meta.data : null} heroSlot={heroSlot} />
        </div>
      </main>
      <Footer meta={meta.status === 'ready' ? meta.data : null} />
    </DataProvider>
  );
}
