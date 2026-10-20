import { useAccountText, type AccountMessageKey } from '../../lib/account/messages';

const SECTIONS: [AccountMessageKey, AccountMessageKey][] = [
  ['privacy_store_h', 'privacy_store'],
  ['privacy_never_h', 'privacy_never'],
  ['privacy_where_h', 'privacy_where'],
  ['privacy_email_h', 'privacy_email'],
  ['privacy_control_h', 'privacy_control'],
];

/** Plain-language account privacy notice. Public: readable before anyone signs up. */
export function PrivacyPage() {
  const at = useAccountText();
  return (
    <div className="page container-narrow">
      <header className="page-head">
        <p className="eyebrow">{at('privacy_eyebrow')}</p>
        <h1 className="page-title">{at('privacy_title')}</h1>
      </header>
      <div className="privacy">
        {SECTIONS.map(([h, body]) => (
          <section key={h} className="prose-section">
            <h2>{at(h)}</h2>
            <p>{at(body)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
