import { useState } from 'react';
import { safeUrl } from '../../lib/article';

/** The first letter of a name (or email), shown when there is no usable avatar image. */
export function initialOf(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name ?? '').trim() || (email ?? '').trim();
  return (Array.from(src)[0] ?? '·').toUpperCase();
}

export function displayNameOf(name: string | null | undefined, email: string | null | undefined): string {
  return (name ?? '').trim() || (email ?? '').split('@')[0] || '';
}

/** Round avatar: the user's https image if it loads, otherwise their initial on a blue-violet disc. */
export function Avatar({ url, name, email, size = 36, alt }: { url?: string | null; name?: string | null; email?: string | null; size?: number; alt?: string }) {
  const [broken, setBroken] = useState(false);
  const src = url && url.startsWith('https://') ? safeUrl(url) : null;
  const style = { inlineSize: size, blockSize: size, fontSize: Math.round(size * 0.42) };
  if (src && !broken) {
    return (
      <img
        className="avatar"
        src={src}
        alt={alt ?? ''}
        width={size}
        height={size}
        style={style}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="avatar is-initial" style={style} role={alt ? 'img' : undefined} aria-label={alt} aria-hidden={alt ? undefined : true}>
      {initialOf(name, email)}
    </span>
  );
}
