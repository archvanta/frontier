import { useI18n, type MessageKey } from '../lib/i18n';
import type { ArticleScore, ScoreParts } from '../lib/types';

const ORDER: { key: keyof ScoreParts; label: MessageKey }[] = [
  { key: 'reliability', label: 'score_reliability' },
  { key: 'corroboration', label: 'score_corroboration' },
  { key: 'recency', label: 'score_recency' },
  { key: 'topic', label: 'score_topic' },
  { key: 'novelty', label: 'score_novelty' },
];

export const DEFAULT_WEIGHTS: ScoreParts = { reliability: 0.3, corroboration: 0.25, recency: 0.2, topic: 0.15, novelty: 0.1 };

/** Segmented bars per factor: factor value (0–100) and its weighted contribution to the total. */
export function ScoreExplain({ score, weights = DEFAULT_WEIGHTS, compact = false }: { score: ArticleScore; weights?: ScoreParts; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <figure className={`score-explain ${compact ? 'is-compact' : ''}`}>
      <figcaption>
        <span>{t('score')}</span>
        <strong>{Math.round(score.total)}</strong>
        <span className="score-max">/100</span>
      </figcaption>
      <ul>
        {ORDER.map(({ key, label }) => {
          const v = Math.round(score.parts[key]);
          const w = weights[key];
          return (
            <li key={key}>
              <span className="se-label">
                {t(label)} <span className="se-weight">×{Math.round(w * 100)}%</span>
              </span>
              <span className="se-track" aria-hidden="true">
                <span className="se-fill" style={{ inlineSize: `${v}%` }} />
              </span>
              <span className="se-value" dir="ltr">
                {v} → {(v * w).toFixed(1)}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
