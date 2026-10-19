import { useEffect, useState } from 'react';
import { planHomePage, sortNewestFirst } from './lib/archive';
import { createDataSource } from './lib/data';
import { useI18n } from './lib/i18n';
import type { Article } from './lib/types';

const data = createDataSource();

export function App() {
  const { t, toggle } = useI18n();
  const [groups, setGroups] = useState<{ day: string; articles: Article[] }[] | null>(null);

  useEffect(() => {
    void (async () => {
      const index = await data.archiveIndex();
      const plan = planHomePage(index?.days ?? [], 1, new Date());
      const files = await Promise.all(plan.days.map((d) => data.day(d)));
      setGroups(plan.days.map((day, i) => ({ day, articles: sortNewestFirst(files[i]?.articles ?? []) })));
    })();
  }, []);

  return (
    <main>
      {data.mode === 'mock' && <p role="note">{t('mock_banner')}</p>}
      <h1>{t('brand')}</h1>
      <button type="button" onClick={toggle}>
        {t('lang_switch')}
      </button>
      {!groups && <p>{t('loading')}</p>}
      {groups?.map((g, i) => (
        <section key={g.day}>
          <h2>{i === 0 ? t('today') : t('yesterday')}</h2>
          <ul>
            {g.articles.map((a) => (
              <li key={a.id}>
                {a.title} — {a.sourceName}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
