import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { ErrorState, Loading } from '../components/States';
import { VideoCell } from '../components/VideoCell';
import { formatNumber } from '../lib/dates';
import { useI18n } from '../lib/i18n';
import { playableVideo } from '../lib/video';
import { HowNote, SectionEmpty, Stat, sourceCount, useSection } from './SectionPage';

/** Videos revealed per click of "More stories". */
const STEP = 9;

export function VideosPage() {
  const { t, locale } = useI18n();
  const res = useSection('videos');
  const [shown, setShown] = useState(STEP + 1);
  const all = useMemo(() => {
    const articles = res.status === 'ready' ? (res.data?.articles ?? []) : [];
    return articles.flatMap((a) => {
      const video = playableVideo(a);
      return video ? [{ article: a, video }] : [];
    });
  }, [res.status, res.data]);
  const [lead, ...rest] = all.slice(0, shown);

  return (
    <div className="page videos-page">
      <header className="page-head">
        <p className="eyebrow">
          <Icon name="play" size={14} /> {t('nav_videos')}
        </p>
        <h1 className="page-title">{t('videos_title')}</h1>
        <p className="page-intro">{t('videos_body')}</p>
        {res.status === 'ready' && (
          <dl className="sec-stats">
            <Stat value={formatNumber(res.data?.total ?? 0, locale)} label={t('section_stories')} />
            <Stat value={formatNumber(sourceCount(all.map((v) => v.article)), locale)} label={t('section_sources')} />
            <Stat value={formatNumber(res.data?.windowDays ?? 90, locale)} label={t('section_days')} />
          </dl>
        )}
        <p className="videos-note">{t('videos_note')}</p>
      </header>
      {res.status === 'loading' && <Loading rows={2} />}
      {res.status === 'error' && <ErrorState onRetry={res.reload} />}
      {res.status === 'ready' &&
        (all.length === 0 ? (
          <SectionEmpty />
        ) : (
          <>
            {lead && <VideoCell article={lead.article} video={lead.video} lead />}
            {rest.length > 0 && (
              <div className="videos-grid">
                {rest.map((v) => (
                  <VideoCell key={v.article.id} article={v.article} video={v.video} />
                ))}
              </div>
            )}
            {all.length > shown && (
              <button type="button" className="btn videos-more" onClick={() => setShown((n) => n + STEP)}>
                {t('section_more')}
              </button>
            )}
          </>
        ))}
      <HowNote body="videos_how_body" />
    </div>
  );
}
