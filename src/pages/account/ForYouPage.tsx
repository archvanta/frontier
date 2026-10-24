import { useMemo, useState, type ReactNode } from 'react';
import { AccountGate } from '../../components/account/AccountGate';
import { displayNameOf } from '../../components/account/Avatar';
import { MergeOffer } from '../../components/account/MergeOffer';
import { Icon } from '../../components/Icon';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { StoryCard } from '../../components/StoryCard';
import { sortNewestFirst } from '../../lib/archive';
import { companyById, topicById, type CompanyId } from '../../lib/account/catalog';
import { useAccount } from '../../lib/account/AccountProvider';
import { useAccountText } from '../../lib/account/messages';
import { companyStories, hasPreferences, rankForReader, type Ranked, type Reason } from '../../lib/account/personalize';
import { useData } from '../../lib/dataContext';
import { formatNumber } from '../../lib/dates';
import { useAsync } from '../../lib/hooks';
import { useI18n } from '../../lib/i18n';
import { href } from '../../lib/router';
import type { Article, PicksFile } from '../../lib/types';

/** Days of the archive the dashboard ranks (plus the weekly picks). */
export const FOR_YOU_DAYS = 3;

export function ReasonLine({ reason }: { reason: Reason | undefined }) {
  const at = useAccountText();
  const { locale } = useI18n();
  if (!reason) return null;
  let text: string;
  switch (reason.kind) {
    case 'release':
      text = at('why_release', { name: companyById(reason.company).name });
      break;
    case 'company':
      text = at('why_company', { name: companyById(reason.company).name });
      break;
    case 'topic':
      text = at('why_topic', { topic: topicById(reason.topic).label[locale] });
      break;
    case 'coverage':
      text = at('why_coverage', { n: formatNumber(reason.sources, locale) });
      break;
    default:
      text = at('why_top');
  }
  return (
    <p className="fy-reason" data-testid="fy-reason">
      <Icon name="sparkle" size={13} />
      {text}
    </p>
  );
}

function Section({ id, title, children, action }: { id: string; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="fy-section" aria-labelledby={id}>
      <header className="section-head">
        <h2 id={id} className="section-title">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function ForYouPage({ now }: { now: Date }) {
  const at = useAccountText();
  const account = useAccount();
  const name = account.user ? displayNameOf(account.profile?.displayName ?? account.user.suggestedName, account.user.username) : '';
  return (
    <div className="page for-you">
      <header className="page-head">
        <p className="eyebrow">{at('fy_eyebrow')}</p>
        <h1 className="page-title" dir="auto">
          {name ? at('fy_title', { name }) : at('fy_title_plain')}
        </h1>
        <p className="page-intro">
          <Icon name="info" size={14} /> {at('fy_sub')}
        </p>
      </header>
      <AccountGate next="/for-you">
        <Dashboard now={now} />
      </AccountGate>
    </div>
  );
}

function Dashboard({ now }: { now: Date }) {
  const data = useData();
  const account = useAccount();
  const at = useAccountText();
  const { t, locale } = useI18n();
  const prefs = account.prefs!;
  const personal = hasPreferences(prefs);
  const [company, setCompany] = useState<CompanyId | 'all'>('all');

  const pool = useAsync(async () => {
    const [index, picks] = await Promise.all([data.archiveIndex(), data.picks()]);
    const days = (index?.days ?? []).slice(0, FOR_YOU_DAYS).map((d) => d.day);
    const files = await Promise.all(days.map((d) => data.day(d)));
    return { articles: files.flatMap((f) => f?.articles ?? []), picks };
  }, [data, now.toISOString().slice(0, 13)]);

  const view = useMemo(() => {
    if (pool.status !== 'ready') return null;
    const { articles, picks } = pool.data;
    const weekly = (picks?.windows.weekly.picks ?? []).map((p) => p.article);
    const ranked = rankForReader([...articles, ...weekly], prefs, now);
    const forYou = ranked.slice(0, 9);
    const shown = new Set(forYou.map((r) => r.article.id));
    const recommended = rankForReader(weekly, prefs, now)
      .filter((r) => !shown.has(r.article.id))
      .slice(0, 6);
    return { forYou, recommended, articles, picks, latest: sortNewestFirst(articles).slice(0, 6) };
  }, [pool, prefs, now]);

  if (pool.status === 'loading') return <Loading rows={3} />;
  if (pool.status === 'error') return <ErrorState onRetry={pool.reload} />;
  if (!view || view.articles.length === 0) return <EmptyState title={at('fy_empty')} />;

  const followed = prefs.companies;
  const companyList = companyStories(view.articles, company === 'all' ? followed : [company], 8);

  return (
    <div className="fy-layout">
      <MergeOffer />

      <nav className="fy-prefs" aria-label={at('fy_edit')}>
        {personal ? (
          <ul className="tag-list">
            {prefs.topics.map((id) => (
              <li key={id} className="tag">
                {topicById(id).label[locale]}
              </li>
            ))}
            {prefs.companies.map((id) => (
              <li key={id} className="tag is-company" lang="en" dir="ltr">
                {companyById(id).name}
              </li>
            ))}
          </ul>
        ) : (
          <p className="fy-global" role="note">
            {at('fy_global_note')}
          </p>
        )}
        <a className="btn is-dark" href={href(personal ? '/account' : '/welcome')}>
          <Icon name="sparkle" size={16} />
          {personal ? at('fy_edit') : at('fy_set_interests')}
        </a>
      </nav>

      <Section id="fy-main" title={at('fy_for_you')}>
        <RankedGrid items={view.forYou} />
        <details className="fy-how">
          <summary>{at('fy_how')}</summary>
          <p>{at('fy_formula')}</p>
        </details>
      </Section>

      <Section id="fy-companies" title={at('fy_companies')}>
        {followed.length === 0 ? (
          <EmptyState title={at('fy_follow_some')}>
            <a className="btn" href={href('/account')}>
              {at('fy_edit')}
            </a>
          </EmptyState>
        ) : (
          <>
            {followed.length > 1 && (
              <div className="filter-chips pill-track" role="group" aria-label={at('fy_companies')}>
                {(['all', ...followed] as const).map((c) => (
                  <button key={c} type="button" className="filter-chip" aria-pressed={company === c} onClick={() => setCompany(c)}>
                    {c === 'all' ? at('fy_all_companies') : <span lang="en">{companyById(c).name}</span>}
                  </button>
                ))}
              </div>
            )}
            {companyList.length === 0 ? (
              <EmptyState title={at('fy_companies_empty')} />
            ) : (
              <div className="story-list">
                {companyList.map((a) => (
                  <StoryCard key={a.id} article={a} variant="list" />
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      {view.recommended.length > 0 && (
        <Section id="fy-rec" title={at('fy_recommended')}>
          <ol className="fy-rows">
            {view.recommended.map((r, i) => (
              <li key={r.article.id}>
                <ReasonLine reason={r.reasons[0]} />
                <StoryCard article={r.article} variant="row" rank={i + 1} />
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Highlights picks={view.picks} />

      <Section
        id="fy-latest"
        title={at('fy_latest')}
        action={
          <a className="section-link" href={href('/')}>
            <span>{t('view_all')}</span>
            <Icon name="arrow" size={16} directional />
          </a>
        }
      >
        <div className="story-list">
          {view.latest.map((a) => (
            <StoryCard key={a.id} article={a} variant="list" />
          ))}
        </div>
      </Section>
    </div>
  );
}

function RankedGrid({ items }: { items: Ranked[] }) {
  return (
    <ol className="fy-grid">
      {items.map((r) => (
        <li key={r.article.id} className="fy-item" data-testid="fy-item" data-personal={r.personal || undefined}>
          <ReasonLine reason={r.reasons[0]} />
          <StoryCard article={r.article} variant="grid" />
        </li>
      ))}
    </ol>
  );
}

function Highlights({ picks }: { picks: PicksFile | null }) {
  const at = useAccountText();
  const top = (w: 'daily' | 'weekly'): Article[] =>
    (picks?.windows[w].picks ?? [])
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 3)
      .map((p) => p.article);
  const daily = top('daily');
  const weekly = top('weekly');
  if (!daily.length && !weekly.length) return null;
  return (
    <Section id="fy-hl" title={at('fy_highlights')}>
      <div className="fy-highlights">
        {(
          [
            ['daily', at('fy_daily'), daily],
            ['weekly', at('fy_weekly'), weekly],
          ] as const
        ).map(
          ([w, label, list]) =>
            list.length > 0 && (
              <div key={w} className="fy-hl-col">
                <h3 className="fy-hl-title">
                  <a href={href(`/picks/${w}`)}>{label}</a>
                </h3>
                <ol className="fy-rows">
                  {list.map((a, i) => (
                    <li key={a.id}>
                      <StoryCard article={a} variant="row" rank={i + 1} headingLevel={4} />
                    </li>
                  ))}
                </ol>
              </div>
            ),
        )}
      </div>
    </Section>
  );
}
