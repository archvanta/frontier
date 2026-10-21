/** Pure helpers for the halftone wordmark (see `components/HalftoneWordmark.tsx`). Unit-tested in `halftone.test.ts`. */

/** `#rgb` / `#rrggbb` → [r, g, b] in 0–255, or null for anything else. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex || '').trim());
  const raw = m?.[1];
  if (!raw) return null;
  const h = raw.length === 3 ? [...raw].map((c) => c + c).join('') : raw;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Dot radius for a cell coverage in [0, 1]: area-true, so the tone of the letter stays even. */
export function dotRadius(coverage: number, gap: number): number {
  const c = coverage < 0 ? 0 : coverage > 1 ? 1 : coverage;
  return Math.sqrt(c) * gap * 0.56;
}

/** One spring step toward home (hx, hy), plus the push from a pointer at (px, py) within radius r. Returns [x, y, vx, vy]. */
export function stepDot(
  x: number, y: number, vx: number, vy: number,
  hx: number, hy: number, px: number, py: number, r: number,
): [number, number, number, number] {
  const dx = x - px;
  const dy = y - py;
  const d2 = dx * dx + dy * dy;
  if (r > 0 && d2 < r * r) {
    const d = Math.sqrt(d2) + 0.001;
    const f = (1 - d / r) * 2.6;
    vx += (dx / d) * f;
    vy += (dy / d) * f;
  }
  vx = (vx + (hx - x) * 0.05) * 0.84;
  vy = (vy + (hy - y) * 0.05) * 0.84;
  return [x + vx, y + vy, vx, vy];
}

/** 0 at home, 1 once the dot is `span` px or more away. */
export function warmth(x: number, y: number, hx: number, hy: number, span: number): number {
  return span > 0 ? Math.min(1, Math.hypot(x - hx, y - hy) / span) : 0;
}

/** Font size that sets a word measured `measured` px wide at 100px to exactly `width`. */
export function fitSize(measured: number, width: number): number {
  return measured > 0 ? (width / measured) * 100 : 0;
}
