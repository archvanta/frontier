import { COMPANIES, TOPICS, type CompanyId, type TopicId } from '../../lib/account/catalog';
import { useAccountText } from '../../lib/account/messages';
import { useI18n } from '../../lib/i18n';
import { formatNumber } from '../../lib/dates';
import { Icon, type IconName } from '../Icon';

const TOPIC_ICONS: Record<TopicId, IconName> = {
  models: 'sparkle',
  tools: 'box',
  research: 'flask',
  'open-source': 'code',
  agents: 'pulse',
  business: 'trend',
  hardware: 'chip',
  'policy-safety': 'shield',
  design: 'layers',
  coding: 'code',
};

const TOPIC_TONES: Record<TopicId, string> = {
  models: 'violet',
  tools: 'indigo',
  research: 'blue',
  'open-source': 'teal',
  agents: 'violet',
  business: 'teal',
  hardware: 'indigo',
  'policy-safety': 'crimson',
  design: 'blue',
  coding: 'indigo',
};

function toggle<T>(list: readonly T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

/** Multi-select topic cards (toggle buttons with aria-pressed). */
export function TopicPicker({ value, onChange, labelledBy }: { value: TopicId[]; onChange: (v: TopicId[]) => void; labelledBy?: string }) {
  const { locale } = useI18n();
  const at = useAccountText();
  return (
    <div className="choice-wrap">
      <div className="choice-grid" role="group" aria-labelledby={labelledBy}>
        {TOPICS.map((tp) => {
          const on = value.includes(tp.id);
          return (
            <button key={tp.id} type="button" className="choice" aria-pressed={on} data-topic={tp.id} onClick={() => onChange(toggle(value, tp.id))}>
              <span className="nav-tile" data-tone={TOPIC_TONES[tp.id]} aria-hidden="true">
                <Icon name={TOPIC_ICONS[tp.id]} size={18} />
              </span>
              <span className="choice-label">{tp.label[locale]}</span>
              <span className="choice-check" aria-hidden="true">
                <Icon name="check" size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="choice-count" aria-live="polite">
        {at('selected_count', { n: formatNumber(value.length, locale) })}
      </p>
    </div>
  );
}

/** Multi-select company cards: Latin brand name plus its products. */
export function CompanyPicker({ value, onChange, labelledBy }: { value: CompanyId[]; onChange: (v: CompanyId[]) => void; labelledBy?: string }) {
  const { locale } = useI18n();
  const at = useAccountText();
  return (
    <div className="choice-wrap">
      <div className="choice-grid" role="group" aria-labelledby={labelledBy}>
        {COMPANIES.map((c) => {
          const on = value.includes(c.id);
          return (
            <button key={c.id} type="button" className="choice" aria-pressed={on} data-company={c.id} onClick={() => onChange(toggle(value, c.id))}>
              <span className="choice-mono" aria-hidden="true" lang="en">
                {c.name.slice(0, 1)}
              </span>
              <span className="choice-text">
                <span className="choice-label" lang="en" dir="ltr">
                  {c.name}
                </span>
                <span className="choice-sub" lang="en" dir="ltr">
                  {c.products}
                </span>
              </span>
              <span className="choice-check" aria-hidden="true">
                <Icon name="check" size={14} />
              </span>
            </button>
          );
        })}
      </div>
      <p className="choice-count" aria-live="polite">
        {at('selected_count', { n: formatNumber(value.length, locale) })}
      </p>
    </div>
  );
}
