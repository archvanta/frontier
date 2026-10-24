import { useId, useState, type FormEvent } from 'react';
import { AccountGate } from '../../components/account/AccountGate';
import { Avatar, displayNameOf } from '../../components/account/Avatar';
import { CompanyPicker, TopicPicker } from '../../components/account/ChoiceChips';
import { Icon } from '../../components/Icon';
import { useAccount } from '../../lib/account/AccountProvider';
import type { CompanyId, TopicId } from '../../lib/account/catalog';
import { toAccountError } from '../../lib/account/errors';
import { errorMessageKey, useAccountText, type AccountMessageKey } from '../../lib/account/messages';
import { formatDateTime, formatNumber } from '../../lib/dates';
import { useI18n } from '../../lib/i18n';
import { href, navigate } from '../../lib/router';
import type { Locale } from '../../lib/types';

type Feedback = { key: AccountMessageKey; error: boolean } | null;

function useSaver() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setFeedback(null);
    try {
      await fn();
      setFeedback({ key: 'saved_ok', error: false });
    } catch (err) {
      const kind = toAccountError(err).kind;
      setFeedback({ key: kind === 'unknown' ? 'err_save' : errorMessageKey(kind), error: true });
    } finally {
      setBusy(false);
    }
  };
  return { busy, feedback, run };
}

function FeedbackLine({ feedback }: { feedback: Feedback }) {
  const at = useAccountText();
  if (!feedback) return null;
  return (
    <p className={feedback.error ? 'form-error' : 'form-info'} role={feedback.error ? 'alert' : 'status'}>
      {at(feedback.key)}
    </p>
  );
}

export function isValidAvatarUrl(v: string): boolean {
  if (!v) return true;
  if (v.length > 500 || !/^https:\/\/[^\s<>"'`]+$/i.test(v)) return false;
  try {
    return new URL(v).protocol === 'https:';
  } catch {
    return false;
  }
}

export function AccountPage() {
  const at = useAccountText();
  return (
    <div className="page container-narrow account-page">
      <header className="page-head">
        <p className="eyebrow">{at('acct_eyebrow')}</p>
        <h1 className="page-title">{at('acct_title')}</h1>
      </header>
      <AccountGate next="/account">
        <AccountSettings />
      </AccountGate>
    </div>
  );
}

function AccountSettings() {
  const account = useAccount();
  const at = useAccountText();
  const { locale, setLocale } = useI18n();
  const uid = useId();
  const profile = account.profile!;
  const user = account.user!;
  const prefs = account.prefs!;

  const [name, setName] = useState(profile.displayName ?? '');
  const [avatar, setAvatar] = useState(profile.avatarUrl ?? '');
  const [lang, setLang] = useState<Locale>(profile.locale);
  const [topics, setTopics] = useState<TopicId[]>(prefs.topics);
  const [companies, setCompanies] = useState<CompanyId[]>(prefs.companies);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState<'closed' | 'open' | 'busy'>('closed');
  const [deleteError, setDeleteError] = useState<AccountMessageKey | null>(null);

  const profileSaver = useSaver();
  const topicSaver = useSaver();
  const companySaver = useSaver();
  const nameOk = name.trim().length <= 60;
  const avatarOk = isValidAvatarUrl(avatar.trim());
  const shown = displayNameOf(profile.displayName, user.username);

  const saveProfile = (e: FormEvent) => {
    e.preventDefault();
    if (!nameOk || !avatarOk) return;
    void profileSaver.run(async () => {
      await account.updateProfile({ displayName: name.trim() || null, avatarUrl: avatar.trim() || null, locale: lang });
      if (lang !== locale) setLocale(lang);
    });
  };

  const deleteAccount = async () => {
    setDeleting('busy');
    setDeleteError(null);
    try {
      await account.deleteAccount();
      account.showToast('acct_deleted');
      navigate('/');
    } catch (err) {
      setDeleteError(errorMessageKey(toAccountError(err).kind));
      setDeleting('open');
    }
  };

  return (
    <div className="account-grid">
      <section className="acct-card acct-identity" aria-labelledby={`${uid}-id`}>
        <Avatar url={profile.avatarUrl} name={shown} email={user.username} size={64} />
        <div className="acct-identity-text">
          <h2 id={`${uid}-id`} className="acct-name" dir="auto">
            {shown}
          </h2>
          <p className="acct-email">
            <span className="visually-hidden">{at('acct_email')}: </span>
            <span dir="ltr">@{user.username}</span>
          </p>
          <p className="acct-meta">
            {at('acct_method_email')}
            <span aria-hidden="true"> · </span>
            {at('acct_member_since')} <time dateTime={profile.createdAt}>{formatDateTime(profile.createdAt, locale)}</time>
          </p>
        </div>
      </section>

      <section className="acct-card" aria-labelledby={`${uid}-profile`}>
        <h2 id={`${uid}-profile`} className="acct-h">
          {at('acct_profile')}
        </h2>
        <form className="acct-form" onSubmit={saveProfile} noValidate>
          <div className="field">
            <label className="auth-label" htmlFor={`${uid}-name`}>
              {at('ob_name_label')}
            </label>
            <input
              id={`${uid}-name`}
              className="auth-input"
              dir="auto"
              maxLength={60}
              autoComplete="nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!nameOk || undefined}
            />
          </div>
          <div className="field">
            <label className="auth-label" htmlFor={`${uid}-avatar`}>
              {at('acct_avatar_label')}
            </label>
            <input
              id={`${uid}-avatar`}
              className="auth-input"
              type="url"
              dir="ltr"
              inputMode="url"
              maxLength={500}
              placeholder="https://"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              aria-invalid={!avatarOk || undefined}
              aria-describedby={`${uid}-avatar-help`}
            />
            <p id={`${uid}-avatar-help`} className={avatarOk ? 'field-help' : 'form-error'}>
              {avatarOk ? at('acct_avatar_help') : at('acct_avatar_invalid')}
            </p>
          </div>
          <div className="field">
            <label className="auth-label" htmlFor={`${uid}-lang`}>
              {at('ob_lang_label')}
            </label>
            <select id={`${uid}-lang`} className="auth-input" value={lang} onChange={(e) => setLang(e.target.value === 'fa' ? 'fa' : 'en')}>
              <option value="fa">فارسی</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="acct-actions">
            <button type="submit" className="btn is-primary" disabled={profileSaver.busy || !nameOk || !avatarOk}>
              {profileSaver.busy ? at('saving') : at('save_changes')}
            </button>
            <FeedbackLine feedback={profileSaver.feedback} />
          </div>
        </form>
      </section>

      <section className="acct-card" id="interests" aria-labelledby={`${uid}-topics`}>
        <h2 id={`${uid}-topics`} className="acct-h">
          {at('acct_interests')}
        </h2>
        <TopicPicker value={topics} onChange={setTopics} labelledBy={`${uid}-topics`} />
        <div className="acct-actions">
          <button type="button" className="btn is-primary" disabled={topicSaver.busy} onClick={() => void topicSaver.run(() => account.saveTopics(topics))}>
            {topicSaver.busy ? at('saving') : at('save_changes')}
          </button>
          <FeedbackLine feedback={topicSaver.feedback} />
        </div>
      </section>

      <section className="acct-card" aria-labelledby={`${uid}-companies`}>
        <h2 id={`${uid}-companies`} className="acct-h">
          {at('acct_companies')}
        </h2>
        <CompanyPicker value={companies} onChange={setCompanies} labelledBy={`${uid}-companies`} />
        <div className="acct-actions">
          <button type="button" className="btn is-primary" disabled={companySaver.busy} onClick={() => void companySaver.run(() => account.saveCompanies(companies))}>
            {companySaver.busy ? at('saving') : at('save_changes')}
          </button>
          <FeedbackLine feedback={companySaver.feedback} />
        </div>
      </section>

      <section className="acct-card" aria-labelledby={`${uid}-saved`}>
        <h2 id={`${uid}-saved`} className="acct-h">
          {at('acct_saved')}
        </h2>
        <p>{at('acct_saved_count', { n: formatNumber(account.saved?.length ?? 0, locale) })}</p>
        <p>
          <a className="btn" href={href('/saved')}>
            <Icon name="bookmark" size={16} />
            {at('acct_open_saved')}
          </a>
        </p>
      </section>

      <section className="acct-card" aria-labelledby={`${uid}-privacy`}>
        <h2 id={`${uid}-privacy`} className="acct-h">
          {at('privacy_eyebrow')}
        </h2>
        <p>{at('privacy_short')}</p>
        <p>
          <a href={href('/privacy')}>{at('privacy_link')}</a>
        </p>
      </section>

      <section className="acct-card" aria-labelledby={`${uid}-session`}>
        <h2 id={`${uid}-session`} className="acct-h">
          {at('acct_session')}
        </h2>
        <div className="acct-actions">
          <button
            type="button"
            className="btn is-dark"
            onClick={async () => {
              await account.signOut().catch(() => {});
              account.showToast('signed_out');
              navigate('/');
            }}
          >
            <Icon name="logout" size={16} />
            {at('sign_out')}
          </button>
          <button
            type="button"
            className="btn is-dark"
            onClick={async () => {
              await account.signOut(true).catch(() => {});
              account.showToast('signed_out');
              navigate('/');
            }}
          >
            {at('sign_out_all')}
          </button>
        </div>
      </section>

      <section className="acct-card acct-danger" aria-labelledby={`${uid}-delete`}>
        <h2 id={`${uid}-delete`} className="acct-h">
          {at('acct_delete')}
        </h2>
        <p>{at('acct_delete_body')}</p>
        {deleting === 'closed' ? (
          <p>
            <button type="button" className="btn is-danger" onClick={() => setDeleting('open')}>
              <Icon name="trash" size={16} />
              {at('acct_delete_start')}
            </button>
          </p>
        ) : (
          <form
            className="acct-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (confirm.trim().toLowerCase() === user.username.toLowerCase()) void deleteAccount();
            }}
          >
            <div className="field">
              <label className="auth-label" htmlFor={`${uid}-confirm`}>
                {at('acct_delete_confirm_label')}
              </label>
              <input
                id={`${uid}-confirm`}
                className="auth-input"
                type="text"
                dir="ltr"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {deleteError && (
              <p className="form-error" role="alert">
                {at(deleteError)}
              </p>
            )}
            <div className="acct-actions">
              <button type="submit" className="btn is-danger" disabled={deleting === 'busy' || confirm.trim().toLowerCase() !== user.username.toLowerCase()}>
                {deleting === 'busy' ? at('acct_deleting') : at('acct_delete_go')}
              </button>
              <button
                type="button"
                className="btn is-dark"
                disabled={deleting === 'busy'}
                onClick={() => {
                  setDeleting('closed');
                  setConfirm('');
                }}
              >
                {at('cancel')}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
