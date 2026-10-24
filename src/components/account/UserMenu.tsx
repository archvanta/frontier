import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useAccount } from '../../lib/account/AccountProvider';
import { useAccountText } from '../../lib/account/messages';
import { useI18n } from '../../lib/i18n';
import { href, navigate, type Route } from '../../lib/router';
import { Icon, type IconName } from '../Icon';
import { Avatar, displayNameOf } from './Avatar';

/** Where "Sign in" should bring the reader back to. Account screens themselves are not useful targets. */
function nextFor(route: Route): string | undefined {
  switch (route.name) {
    case 'saved':
      return '/saved';
    case 'for-you':
    case 'account':
      return `/${route.name}`;
    default:
      return undefined;
  }
}

/**
 * Header slot: a placeholder while a stored session restores (no flash of "Sign in"), a sign-in pill
 * for visitors, or the avatar button with a small account panel.
 */
export function UserMenu({ route }: { route: Route }) {
  const account = useAccount();
  const at = useAccountText();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);

  useEffect(() => setOpen(false), [route]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  if (account.status === 'off') return null;

  if (account.status === 'restoring') {
    return <span className="user-slot is-pending" aria-hidden="true" />;
  }

  if (account.status !== 'signed-in' || !account.user) {
    const onSignin = route.name === 'signin';
    return (
      <a
        className="btn is-dark user-signin"
        href={href('/signin', { next: nextFor(route) })}
        aria-label={at('sign_in')}
        aria-current={onSignin ? 'page' : undefined}
        onPointerEnter={account.prepare}
        onFocus={account.prepare}
      >
        <Icon name="user" size={16} />
        <span className="user-signin-label">{at('sign_in')}</span>
      </a>
    );
  }

  const { user, profile } = account;
  const name = displayNameOf(profile?.displayName ?? user.suggestedName, user.username);
  const items: { key: string; to: string; icon: IconName; title: string; desc: string }[] = [
    { key: 'for-you', to: '/for-you', icon: 'sparkle', title: at('menu_for_you'), desc: at('menu_for_you_d') },
    { key: 'saved', to: '/saved', icon: 'bookmark', title: t('nav_saved'), desc: at('menu_saved_d') },
    { key: 'account', to: '/account', icon: 'user', title: at('menu_account'), desc: at('menu_account_d') },
  ];

  const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('a, button') ?? []);
  const onPanelKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const all = focusables();
    const at0 = all.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => all[(i + all.length) % all.length]?.focus();
    if (e.key === 'ArrowDown') go(at0 + 1);
    else if (e.key === 'ArrowUp') go(at0 - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(all.length - 1);
    else if (e.key === 'Escape') {
      setOpen(false);
      trigger.current?.focus();
    } else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const signOut = async () => {
    setOpen(false);
    try {
      await account.signOut();
    } finally {
      account.showToast('signed_out');
      navigate('/');
    }
  };

  return (
    <div
      ref={wrap}
      className={`user-menu ${open ? 'is-open' : ''}`}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="user-trigger"
        aria-expanded={open}
        aria-controls={open ? 'user-panel' : undefined}
        aria-label={`${at('menu_label')}: ${name}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            window.setTimeout(() => focusables()[0]?.focus(), 0);
          }
        }}
      >
        <Avatar url={profile?.avatarUrl} name={name} email={user.username} size={34} />
      </button>
      {open && (
        <div className="user-panel" id="user-panel">
          <div className="user-panel-head">
            <Avatar url={profile?.avatarUrl} name={name} email={user.username} size={40} />
            <div className="user-panel-id">
              <span className="user-panel-name" dir="auto">
                {name}
              </span>
              <span className="user-panel-email" dir="ltr">
                @{user.username}
              </span>
            </div>
          </div>
          <ul ref={panel} className="user-panel-list" aria-label={at('menu_label')} onKeyDown={onPanelKey}>
            {items.map((it) => (
              <li key={it.key}>
                <a className="nav-row" href={href(it.to)} aria-current={route.name === it.key ? 'page' : undefined}>
                  <span className="nav-tile" data-tone={it.key === 'for-you' ? 'violet' : it.key === 'saved' ? 'blue' : 'teal'} aria-hidden="true">
                    <Icon name={it.icon} size={18} />
                  </span>
                  <span className="nav-row-text">
                    <span className="nav-row-title">{it.title}</span>
                    <span className="nav-row-desc">{it.desc}</span>
                  </span>
                </a>
              </li>
            ))}
            <li>
              <button type="button" className="nav-row user-signout" onClick={signOut}>
                <span className="nav-tile" data-tone="crimson" aria-hidden="true">
                  <Icon name="logout" size={18} />
                </span>
                <span className="nav-row-text">
                  <span className="nav-row-title">{at('sign_out')}</span>
                </span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
