import { useI18n } from '../lib/i18n';
import { Icon } from './Icon';

/**
 * First scene of the homepage: what the site is, in one calm screen. The page's h1 lives here.
 * The backdrop is plain CSS (soft drifting light, a faint grid): no video, nothing to download.
 */
export function HomeIntro({ onContinue }: { onContinue: () => void }) {
  const { t } = useI18n();
  return (
    <section className="home-intro" aria-labelledby="home-title">
      <div className="hi-backdrop" aria-hidden="true">
        <span className="hi-glow hi-glow-a" />
        <span className="hi-glow hi-glow-b" />
        <span className="hi-grid" />
      </div>
      <div className="container hi-inner">
        <p className="hi-kicker">[ {t('intro_kicker')} ]</p>
        <h1 id="home-title" className="hi-title" lang="en" dir="ltr">
          FRONTIER
        </h1>
        <p className="hi-body">{t('intro_body')}</p>
        <p className="hi-meta">{t('intro_meta')}</p>
      </div>
      <button type="button" className="hi-scroll" onClick={onContinue}>
        <span>{t('intro_scroll')}</span>
        <Icon name="chevronDown" size={16} />
      </button>
    </section>
  );
}
