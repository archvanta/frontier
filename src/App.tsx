import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AccountToast } from './components/account/AccountToast';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { EmptyState } from './components/States';
import { AccountProvider } from './lib/account/AccountProvider';
import type { AccountConfig } from './lib/account/config';
import type { AccountBackend } from './lib/account/types';
import { createDataSource, type DataSource } from './lib/data';
import { DataProvider } from './lib/dataContext';
import { focusSection } from './lib/focus';
import { useAsync } from './lib/hooks';
import { useI18n } from './lib/i18n';
import { href, parseHash, routePath, useHash, type Route } from './lib/router';
import { AboutPage } from './pages/AboutPage';
import { AccountPage } from './pages/account/AccountPage';
import { ForYouPage } from './pages/account/ForYouPage';
import { OnboardingPage } from './pages/account/OnboardingPage';
import { PrivacyPage } from './pages/account/PrivacyPage';
import { SignInPage } from './pages/account/SignInPage';
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
    case 'signin':
      return <SignInPage create={route.create} next={route.next} />;
    case 'welcome':
      return <OnboardingPage />;
    case 'account':
      return <AccountPage />;
    case 'for-you':
      return <ForYouPage now={now} />;
    case 'privacy':
      return <PrivacyPage />;
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

export function App({ source, account }: { source?: DataSource; account?: { config?: AccountConfig; backend?: AccountBackend } }) {
  const data = useMemo(() => source ?? createDataSource(), [source]);
  const { t } = useI18n();
  const hash = useHash();
  const route = useMemo(() => parseHash(hash), [hash]);
  const now = useNow();
  const [heroSlot, setHeroSlot] = useState<HTMLElement | null>(null);
  const meta = useAsync(() => data.meta(), [data]);

  // Layout effect: inside a page transition the scroll must be reset before the browser captures the new page.
  useLayoutEffect(() => {
    if (route.name !== 'home' || route.page !== 1) window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <DataProvider source={data}>
      <AccountProvider config={account?.config} backend={account?.backend}>
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
        {/* Keyed by page: without view transitions the new page plays a short CSS entrance instead (styles/motion.css). */}
        <div key={routePath(hash)} className="container site-main route-view">
          <Page route={route} now={now} meta={meta.status === 'ready' ? meta.data : null} heroSlot={heroSlot} />
        </div>
      </main>
      <Footer meta={meta.status === 'ready' ? meta.data : null} />
      <AccountToast />
      </AccountProvider>
    </DataProvider>
  );
}
