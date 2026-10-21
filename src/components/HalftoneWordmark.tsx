import { useEffect, useRef, type ReactNode } from 'react';
import { dotRadius, fitSize, parseHex, stepDot, warmth } from '../lib/halftone';
import { useMotionMode } from '../lib/motion';

/**
 * The hero word printed as a field of halftone dots (dot size follows how much of the letter covers its cell). The dots part around the
 * pointer on springs and warm toward the accent as they leave home; a click or tap sends a shock ring through the word.
 *
 * The real text stays in the DOM as the heading and as the static fallback: the canvas only takes over (`data-halftone="on"`) in full-motion
 * mode when 2D canvas works. Colours come from `--hw-ink` / `--hw-warm` on the heading. Nothing runs while the word is off-screen or at rest.
 */
/** Dot spacing and pointer reach in CSS px at desktop size; both shrink with the word on a phone. */
const GAP = 6;
const RADIUS = 80;

export function HalftoneWordmark({ children, word }: { children?: ReactNode; word: string }) {
  const mode = useMotionMode();
  const full = mode === 'full';
  const host = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = host.current;
    const canvas = canvasRef.current;
    const title = el?.parentElement;
    if (!full || !el || !canvas || !title) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let px = -1e5;
    let py = -1e5;
    let raf = 0;
    let idle = 0;
    let visible = true;
    let ring = { x: 0, y: 0, t: -1 };
    let dots = new Float32Array(0); // x, y, vx, vy, hx, hy, r
    let count = 0;
    let gap = GAP;
    let radius = RADIUS;
    let ink: [number, number, number] = [230, 233, 255];
    let warm: [number, number, number] = [198, 255, 74];
    let inkCss = '#e6e9ff';

    const layout = () => {
      const cs = getComputedStyle(title);
      inkCss = cs.getPropertyValue('--hw-ink').trim() || inkCss;
      ink = parseHex(inkCss) ?? ink;
      warm = parseHex(cs.getPropertyValue('--hw-warm').trim()) ?? warm;
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);

      // The word is set once on a 1x mask, filling the heading's own width, vertically centred on its cap height.
      const mask = document.createElement('canvas');
      mask.width = w;
      mask.height = h;
      const m = mask.getContext('2d', { willReadFrequently: true });
      if (!m) return;
      const family = cs.fontFamily;
      const padX = Math.max(0, (w - title.getBoundingClientRect().width) / 2);
      m.font = `800 100px ${family}`;
      const measured = m.measureText(word).width;
      const size = fitSize(measured, Math.max(1, w - padX * 2));
      m.font = `800 ${size}px ${family}`;
      const box = m.measureText(word);
      const cap = box.actualBoundingBoxAscent || size * 0.72;
      m.fillStyle = '#000';
      m.fillText(word, (w - box.width) / 2, (h + cap) / 2);
      const img = m.getImageData(0, 0, w, h).data;

      gap = size < 90 ? 4 : GAP;
      radius = Math.min(RADIUS, Math.max(28, cap * 0.6));
      const cols = Math.ceil(w / gap);
      const rows = Math.ceil(h / gap);
      const tmp: number[] = [];
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const x = Math.min(w - 1, Math.floor(gx * gap + ((sx + 0.5) * gap) / 3));
              const y = Math.min(h - 1, Math.floor(gy * gap + ((sy + 0.5) * gap) / 3));
              sum += img[(y * w + x) * 4 + 3] ?? 0;
            }
          }
          const cov = sum / (9 * 255);
          if (cov < 0.06) continue;
          const hx = gx * gap + gap / 2;
          const hy = gy * gap + gap / 2;
          tmp.push(hx, hy, 0, 0, hx, hy, dotRadius(cov, gap));
        }
      }
      dots = new Float32Array(tmp);
      count = tmp.length / 7;
    };

    const draw = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ringAge = ring.t < 0 ? 1e9 : now - ring.t;
      const ringR = ringAge * 0.9;
      let moving = false;
      for (let i = 0; i < count; i++) {
        const j = i * 7;
        let x = dots[j] ?? 0;
        let y = dots[j + 1] ?? 0;
        let vx = dots[j + 2] ?? 0;
        let vy = dots[j + 3] ?? 0;
        const hx = dots[j + 4] ?? 0;
        const hy = dots[j + 5] ?? 0;
        if (ringAge < 900) {
          const dx = hx - ring.x;
          const dy = hy - ring.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 0.001;
          const band = 1 - Math.min(1, Math.abs(d - ringR) / 26);
          if (band > 0) {
            const f = band * 3.2 * (1 - ringAge / 900);
            vx += (dx / d) * f;
            vy += (dy / d) * f;
          }
        }
        [x, y, vx, vy] = stepDot(x, y, vx, vy, hx, hy, px, py, radius);
        if (Math.abs(vx) + Math.abs(vy) > 0.02 || Math.abs(x - hx) + Math.abs(y - hy) > 0.05) moving = true;
        else [x, y, vx, vy] = [hx, hy, 0, 0];
        dots[j] = x;
        dots[j + 1] = y;
        dots[j + 2] = vx;
        dots[j + 3] = vy;
        const k = warmth(x, y, hx, hy, 28);
        ctx.fillStyle =
          k > 0.02
            ? `rgb(${Math.round(ink[0] + (warm[0] - ink[0]) * k)},${Math.round(ink[1] + (warm[1] - ink[1]) * k)},${Math.round(ink[2] + (warm[2] - ink[2]) * k)})`
            : inkCss;
        ctx.beginPath();
        ctx.arc(x, y, dots[j + 6] ?? 0, 0, 6.2832);
        ctx.fill();
      }
      return moving || ringAge < 900 || px > -1e4;
    };

    const loop = (now: number) => {
      raf = 0;
      if (!visible) return;
      if (draw(now)) raf = requestAnimationFrame(loop);
    };
    const wake = () => {
      if (!raf && visible) raf = requestAnimationFrame(loop);
    };
    const local = (e: PointerEvent): [number, number] => {
      const b = canvas.getBoundingClientRect();
      return [e.clientX - b.left, e.clientY - b.top];
    };
    const onLeave = () => {
      window.clearTimeout(idle);
      px = py = -1e5;
      wake();
    };
    // A pointer that stops (or is parked at the edge) lets go after a moment, so no dot stays pushed out and clipped at the canvas edge.
    const onMove = (e: PointerEvent) => {
      [px, py] = local(e);
      window.clearTimeout(idle);
      idle = window.setTimeout(onLeave, 1200);
      wake();
    };
    const onDown = (e: PointerEvent) => {
      [px, py] = local(e);
      ring = { x: px, y: py, t: performance.now() };
      wake();
    };

    layout();
    draw(performance.now());
    title.setAttribute('data-halftone', 'on');

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointercancel', onLeave);
    canvas.addEventListener('pointerup', (e) => e.pointerType !== 'mouse' && onLeave());
    canvas.addEventListener('pointerdown', onDown);
    const ro = new ResizeObserver(() => {
      layout();
      draw(performance.now());
      wake();
    });
    ro.observe(title);
    const io = new IntersectionObserver(([e]) => {
      visible = e ? e.isIntersecting : true;
      if (visible) wake();
    });
    io.observe(el);
    let alive = true;
    void document.fonts?.ready.then(() => {
      if (!alive) return;
      layout();
      draw(performance.now());
    });
    // Theme change flips the colour tokens; re-read them.
    const mo = new MutationObserver(() => {
      layout();
      draw(performance.now());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'lang'] });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(idle);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      title.removeAttribute('data-halftone');
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
    };
  }, [full, word]);

  return (
    <span ref={host} className="hw">
      <span className="hw-text">{children ?? word}</span>
      {full && <canvas ref={canvasRef} className="hw-canvas" aria-hidden="true" />}
    </span>
  );
}
