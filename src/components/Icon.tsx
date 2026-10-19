const PATHS = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  bookmark: 'M6 4h12v17l-6-4-6 4z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h4v14H7zM13 5h4v14h-4z',
  chevron: 'M9 6l6 6-6 6',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 7.5v.5',
  pulse: 'M3 13h4l3-8 4 14 3-9 2 3h2',
} as const;

export type IconName = keyof typeof PATHS;

/** `directional` icons point toward inline-end and flip in RTL; `back` icons point toward inline-start. */
export function Icon({
  name,
  size = 18,
  directional = false,
  back = false,
  filled = false,
}: {
  name: IconName;
  size?: number;
  directional?: boolean;
  back?: boolean;
  filled?: boolean;
}) {
  return (
    <svg
      className={back ? 'icon icon-back' : directional ? 'icon icon-dir' : 'icon'}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
