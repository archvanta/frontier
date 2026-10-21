import { TopicPicker } from './account/ChoiceChips';
import { useFollowedTopics } from '../lib/follow';
import { useI18n } from '../lib/i18n';

/** "Choose what you follow": the same topic cards as onboarding, saved as a list of topic ids (see lib/follow.ts). */
export function FollowTopics({ onSkip }: { onSkip: () => void }) {
  const { t } = useI18n();
  const { topics, setTopics } = useFollowedTopics();
  return (
    <section id="follow" className="follow-topics" aria-labelledby="follow-title" tabIndex={-1}>
      <div className="follow-panel">
        <header className="follow-head">
          <p className="hi-kicker">[ {t('follow_kicker')} ]</p>
          <h2 id="follow-title" className="follow-title">
            {t('follow_title')}
          </h2>
          <p className="follow-sub">{t('follow_sub')}</p>
        </header>
        <TopicPicker value={topics} onChange={setTopics} labelledBy="follow-title" />
        <div className="follow-actions">
          {topics.length > 0 && (
            <button type="button" className="btn" onClick={() => setTopics([])}>
              {t('follow_clear')}
            </button>
          )}
          <button type="button" className="btn is-primary" onClick={onSkip}>
            {t('follow_skip')}
          </button>
        </div>
      </div>
    </section>
  );
}
