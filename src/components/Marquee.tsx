import type { CSSProperties, ReactNode } from 'react';

interface MarqueeProps {
  /** Receives `true` for the repeated copies, which are visual only (aria-hidden, no links to tab through). */
  children: (decorative: boolean) => ReactNode;
  vertical?: boolean;
  reverse?: boolean;
  pauseOnHover?: boolean;
  /** Paused from outside (off-screen, hidden tab). */
  paused?: boolean;
  /** Copies of the content in the track; the loop needs the track to cover the viewport twice. */
  repeat?: number;
  /** Seconds per loop. */
  duration?: number;
  className?: string;
}

/**
 * Port of the 21st.dev "3D testimonials" Marquee to plain CSS keyframes (see `.marquee` in app.css):
 * the same props (vertical, reverse, pauseOnHover, repeat) and the same translate-by-one-track loop, without Tailwind or shadcn.
 */
export function Marquee({ children, vertical = false, reverse = false, pauseOnHover = true, paused = false, repeat = 3, duration = 40, className = '' }: MarqueeProps) {
  const cls = ['marquee', vertical && 'is-vertical', reverse && 'is-reverse', pauseOnHover && 'pause-on-hover', paused && 'is-paused', className].filter(Boolean).join(' ');
  return (
    <div className={cls} style={{ '--duration': `${duration}s` } as CSSProperties}>
      {Array.from({ length: Math.max(1, repeat) }, (_, i) => (
        <div key={i} className="marquee-track" aria-hidden={i > 0 ? true : undefined}>
          {children(i > 0)}
        </div>
      ))}
    </div>
  );
}
