import { useEffect, useId, useState } from 'react';
import { AccountGate } from '../../components/account/AccountGate';
import { CompanyPicker, TopicPicker } from '../../components/account/ChoiceChips';
import { companyById, isCompanyId, isTopicId, topicById, type CompanyId, type TopicId } from '../../lib/account/catalog';
import { useAccount } from '../../lib/account/AccountProvider';
import { toAccountError } from '../../lib/account/errors';
import { errorMessageKey, useAccountText, type AccountMessageKey } from '../../lib/account/messages';
import type { Profile } from '../../lib/account/types';
import { formatNumber } from '../../lib/dates';
import { useI18n } from '../../lib/i18n';
import { navigate } from '../../lib/router';
import type { Locale } from '../../lib/types';

export const STEPS = 4;
const DRAFT_PREFIX = 'signal-ai:onboarding-draft:';

export interface Draft {
  name: string;
  locale: Locale;
  topics: TopicId[];
  companies: CompanyId[];
}

/** Unsaved edits on the current step survive a reload (this tab only). Saved steps come from the database. */
function readDraft(uid: string): Partial<Draft> | null {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(DRAFT_PREFIX + uid) ?? 'null') as Partial<Draft> | null;
    if (!v || typeof v !== 'object') return null;
    return {
      name: typeof v.name === 'string' ? v.name.slice(0, 60) : undefined,
      locale: v.locale === 'fa' || v.locale === 'en' ? v.locale : undefined,
      topics: Array.isArray(v.topics) ? v.topics.filter(isTopicId) : undefined,
      companies: Array.isArray(v.companies) ? v.companies.filter(isCompanyId) : undefined,
    };
  } catch {
    return null;
  }
}

function writeDraft(uid: string, d: Draft | null) {
  try {
    if (d) window.sessionStorage.setItem(DRAFT_PREFIX + uid, JSON.stringify(d));
    else window.sessionStorage.removeItem(DRAFT_PREFIX + uid);
  } catch {
    /* storage blocked */
  }
}

/** Resume after the last finished step; a finished onboarding opened again starts at the top as an editor. */
export function firstStep(p: Pick<Profile, 'onboardingStep' | 'onboardingCompletedAt'>): number {
  if (p.onboardingCompletedAt) return 1;
  return Math.min(STEPS, Math.max(1, p.onboardingStep + 1));
}

export function OnboardingPage() {
  return (
    <div className="page container-narrow onboarding">
      <AccountGate next="/welcome">
        <Onboarding />
      </AccountGate>
    </div>
  );
}

function Onboarding() {
  const account = useAccount();
  const at = useAccountText();
  const { locale, setLocale } = useI18n();
  const uid = useId();
  const profile = account.profile!;
  const user = account.user!;
  const prefs = account.prefs!;
  const [step, setStep] = useState(() => firstStep(profile));
  const [draft, setDraft] = useState<Draft>(() => {
    const saved = readDraft(user.id);
    return {
      name: saved?.name ?? profile.displayName ?? user.suggestedName ?? '',
      locale: saved?.locale ?? (profile.onboardingStep > 0 ? profile.locale : locale),
      topics: saved?.topics ?? prefs.topics,
      companies: saved?.companies ?? prefs.companies,
    };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AccountMessageKey | null>(null);

  useEffect(() => writeDraft(user.id, draft), [user.id, draft]);
  useEffect(() => {
    document.getElementById(`${uid}-h`)?.focus();
  }, [step, uid]);

  const nameTrim = draft.name.trim();
  const nameOk = nameTrim.length <= 60;

  const save = async (fn: () => Promise<unknown>, nextStep: number | 'done') => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (nextStep === 'done') {
        writeDraft(user.id, null);
        navigate('/for-you');
      } else setStep(nextStep);
    } catch (err) {
      const kind = toAccountError(err).kind;
      setError(kind === 'unknown' ? 'err_save' : errorMessageKey(kind));
    } finally {
      setBusy(false);
    }
  };
  const mark = (n: number) => Math.max(profile.onboardingStep, n);

  const stepA = () =>
    save(() => account.updateProfile({ displayName: nameTrim || null, locale: draft.locale, onboardingStep: mark(1) }), 2);
  const stepB = (topics: TopicId[]) =>
    save(async () => {
      await account.saveTopics(topics);
      await account.updateProfile({ onboardingStep: mark(2) });
    }, 3);
  const stepC = (companies: CompanyId[]) =>
    save(async () => {
      await account.saveCompanies(companies);
      await account.updateProfile({ onboardingStep: mark(3) });
    }, 4);
  // Every write is repeated here, and completion is recorded only after all of them succeeded.
  const finish = () =>
    save(async () => {
      await account.saveTopics(draft.topics);
      await account.saveCompanies(draft.companies);
      await account.updateProfile({ displayName: nameTrim || null, locale: draft.locale, onboardingStep: STEPS, onboardingCompletedAt: new Date().toISOString() });
    }, 'done');

  const titles: Record<number, [AccountMessageKey, AccountMessageKey]> = {
    1: ['ob_a_title', 'ob_a_sub'],
    2: ['ob_b_title', 'ob_b_sub'],
    3: ['ob_c_title', 'ob_c_sub'],
    4: ['ob_d_title', 'ob_d_sub'],
  };
  const [titleKey, subKey] = titles[step]!;

  return (
    <section className="ob-card" aria-labelledby={`${uid}-h`} data-testid="onboarding" data-step={step}>
      <header className="ob-head">
        <p className="eyebrow">{at('ob_eyebrow')}</p>
        <ol className="ob-steps" aria-label={at('ob_steps')}>
          {Array.from({ length: STEPS }, (_, i) => (
            <li key={i} className={i + 1 < step ? 'is-done' : i + 1 === step ? 'is-current' : ''} aria-current={i + 1 === step ? 'step' : undefined}>
              <span className="visually-hidden">{at('ob_step', { n: formatNumber(i + 1, locale), total: formatNumber(STEPS, locale) })}</span>
            </li>
          ))}
        </ol>
        <p className="ob-count">{at('ob_step', { n: formatNumber(step, locale), total: formatNumber(STEPS, locale) })}</p>
        <h1 id={`${uid}-h`} className="ob-title" tabIndex={-1}>
          {at(titleKey)}
        </h1>
        <p className="ob-sub">{at(subKey)}</p>
      </header>

      {step === 1 && (
        <div className="ob-body">
          <div className="field">
            <label className="auth-label" htmlFor={`${uid}-name`}>
              {at('ob_name_label')}
            </label>
            <input
              id={`${uid}-name`}
              className="auth-input"
              dir="auto"
              autoComplete="nickname"
              maxLength={60}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              aria-invalid={!nameOk || undefined}
            />
          </div>
          <fieldset className="field lang-cards">
            <legend className="auth-label">{at('ob_lang_label')}</legend>
            {(
              [
                ['fa', 'فارسی', 'Persian · RTL'],
                ['en', 'English', 'انگلیسی · LTR'],
              ] as const
            ).map(([id, name, sub]) => (
              <label key={id} className="lang-card">
                <input
                  type="radio"
                  name={`${uid}-lang`}
                  value={id}
                  checked={draft.locale === id}
                  onChange={() => {
                    setDraft({ ...draft, locale: id });
                    setLocale(id);
                  }}
                />
                <span className="lang-card-name" lang={id}>
                  {name}
                </span>
                <span className="lang-card-sub">{sub}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <div className="ob-body">
          <span id={`${uid}-topics`} className="visually-hidden">
            {at('ob_topics')}
          </span>
          <TopicPicker value={draft.topics} onChange={(topics) => setDraft({ ...draft, topics })} labelledBy={`${uid}-topics`} />
        </div>
      )}

      {step === 3 && (
        <div className="ob-body">
          <span id={`${uid}-companies`} className="visually-hidden">
            {at('ob_companies')}
          </span>
          <CompanyPicker value={draft.companies} onChange={(companies) => setDraft({ ...draft, companies })} labelledBy={`${uid}-companies`} />
        </div>
      )}

      {step === 4 && (
        <dl className="ob-review">
          <div className="ob-review-row">
            <dt>{at('ob_profile')}</dt>
            <dd>
              <span dir="auto">{nameTrim || user.username}</span> · {draft.locale === 'fa' ? 'فارسی' : 'English'}
            </dd>
            <button type="button" className="link-btn" onClick={() => setStep(1)}>
              {at('edit')}
            </button>
          </div>
          <div className="ob-review-row">
            <dt>{at('ob_topics')}</dt>
            <dd>
              {draft.topics.length ? (
                <ul className="tag-list">
                  {draft.topics.map((id) => (
                    <li key={id} className="tag">
                      {topicById(id).label[locale]}
                    </li>
                  ))}
                </ul>
              ) : (
                at('ob_none')
              )}
            </dd>
            <button type="button" className="link-btn" onClick={() => setStep(2)}>
              {at('edit')}
            </button>
          </div>
          <div className="ob-review-row">
            <dt>{at('ob_companies')}</dt>
            <dd>
              {draft.companies.length ? (
                <ul className="tag-list">
                  {draft.companies.map((id) => (
                    <li key={id} className="tag" lang="en" dir="ltr">
                      {companyById(id).name}
                    </li>
                  ))}
                </ul>
              ) : (
                at('ob_none')
              )}
            </dd>
            <button type="button" className="link-btn" onClick={() => setStep(3)}>
              {at('edit')}
            </button>
          </div>
        </dl>
      )}

      {error && (
        <p className="form-error" role="alert">
          {at(error)}
        </p>
      )}
      {step === 1 && !nameOk && (
        <p className="form-error" role="alert">
          {at('acct_name_invalid')}
        </p>
      )}

      <div className="ob-actions">
        {step > 1 && (
          <button type="button" className="btn is-dark" onClick={() => setStep(step - 1)} disabled={busy}>
            {at('back')}
          </button>
        )}
        <span className="meta-spacer" />
        {(step === 2 || step === 3) && (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => {
              if (step === 2) {
                setDraft({ ...draft, topics: [] });
                void stepB([]);
              } else {
                setDraft({ ...draft, companies: [] });
                void stepC([]);
              }
            }}
          >
            {at('skip')}
          </button>
        )}
        <button
          type="button"
          className="btn is-primary"
          disabled={busy || (step === 1 && !nameOk)}
          aria-busy={busy}
          onClick={() => void (step === 1 ? stepA() : step === 2 ? stepB(draft.topics) : step === 3 ? stepC(draft.companies) : finish())}
        >
          {busy ? at('saving') : step === STEPS ? at('finish') : at('next')}
        </button>
      </div>
    </section>
  );
}
