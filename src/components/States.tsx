import type { ReactNode } from 'react';
import { useI18n } from '../lib/i18n';

export function Loading({ rows = 3 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div className="skeleton-grid" role="status" aria-live="polite">
      <span className="visually-hidden">{t('loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-card" aria-hidden="true">
          <div className="skeleton skeleton-media" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, tone = 'neutral' }: { title: string; children?: ReactNode; tone?: 'neutral' | 'error' }) {
  return (
    <div className={`empty-state swap-in ${tone === 'error' ? 'is-error' : ''}`} role={tone === 'error' ? 'alert' : undefined}>
      <span className="empty-mark" aria-hidden="true" />
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState title={t('load_failed')} tone="error">
      {onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </EmptyState>
  );
}
