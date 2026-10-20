import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../lib/hooks';

/**
 * "Glass fold": soft translucent blue ribbons with glowing creases, drawn by a small self-written fragment shader
 * (no library, no texture, no network). A static CSS rendering of the same look sits underneath and is all that
 * is shown when WebGL is unavailable, the context is lost, motion is reduced, or the canvas is off-screen.
 */
const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r;
uniform float t;

// A fold: the phase rises across the surface and has a crease at every whole PI.
// Just past a crease the glass is lit (bright, decaying); the thin crease itself glows near-white.
vec3 fold(vec2 p, float k, float dir) {
  p += 0.28 * vec2(sin(p.y * 1.15 + t * 0.5 + k), cos(p.x * 0.95 - t * 0.4 + k * 2.0));
  float ph = p.y * 1.9 + dir * p.x * 1.15 + 0.9 * sin(p.x * 1.1 - t * 0.3 + k) + t * 0.2;
  float f = fract(ph / 3.14159);
  float lit = pow(1.0 - f, 2.6);
  float crease = exp(-f * 60.0) + exp(-(1.0 - f) * 60.0);
  float halo = exp(-f * 9.0) + 0.5 * exp(-(1.0 - f) * 14.0);
  return vec3(lit, crease, halo);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * r) / r.y;
  vec3 deep = vec3(0.004, 0.008, 0.03);
  vec3 royal = vec3(0.10, 0.22, 0.72);
  vec3 mid = vec3(0.16, 0.34, 0.95);
  vec3 ice = vec3(0.72, 0.88, 1.0);
  vec3 col = deep + royal * 0.16;
  for (int i = 0; i < 3; i++) {
    float f = float(i);
    vec3 l = fold(uv * (1.55 + 0.4 * f) + vec2(0.4 * f, -0.25 * f), f * 2.1, -1.0 + 0.35 * f);
    float w = 1.0 - 0.3 * f;
    col += royal * l.x * 0.7 * w;
    col += mid * l.z * 0.3 * w;
    col += ice * l.y * 0.95 * w;
  }
  float vig = smoothstep(1.3, 0.1, length(uv * vec2(0.75, 1.0)));
  col *= 0.4 + 0.75 * vig;
  col = col / (1.0 + col * 0.45);
  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/** Longest edge of the render buffer; the glow is smooth so a modest buffer scaled up by CSS looks the same. */
const MAX_SIDE = 960;
const FRAME_MS = 1000 / 30;

export function GlassFold({ active = true, className = '' }: { active?: boolean; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [live, setLive] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const run = active && onScreen && tabVisible && !reduced;
  const runRef = useRef(run);
  const kickRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    runRef.current = run;
    kickRef.current?.(); // (re)start the frame loop when the canvas becomes visible again
  }, [run]);

  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setOnScreen(Boolean(e?.isIntersecting)), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const on = () => setTabVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  // Set up GL once (unless motion is reduced or WebGL is missing) and draw while `run` is true.
  useEffect(() => {
    const cv = canvas.current;
    const box = wrap.current;
    if (!cv || !box || reduced || typeof WebGLRenderingContext === 'undefined') return;
    let gl: WebGLRenderingContext | null;
    try {
      gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    } catch {
      gl = null;
    }
    if (!gl) return;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'r');
    const uTime = gl.getUniformLocation(prog, 't');
    const g = gl;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = box;
      if (!w || !h) return;
      const k = Math.min(1, MAX_SIDE / Math.max(w, h));
      const bw = Math.max(2, Math.round(w * k));
      const bh = Math.max(2, Math.round(h * k));
      if (cv.width !== bw || cv.height !== bh) {
        cv.width = bw;
        cv.height = bh;
      }
      g.viewport(0, 0, bw, bh);
      g.uniform2f(uRes, bw, bh);
    };
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    ro?.observe(box);
    resize();

    let raf = 0;
    let last = 0;
    let clock = 12; // start mid-drift so the first frame already has composed folds
    let prev = 0;
    let lost = false;
    const draw = (now: number) => {
      raf = 0;
      if (lost || !runRef.current) return;
      raf = requestAnimationFrame(draw);
      if (now - last < FRAME_MS) return;
      clock += prev ? Math.min(0.1, (now - prev) / 1000) : 0;
      prev = now;
      last = now;
      g.uniform1f(uTime, clock);
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      setLive(true);
    };
    const kick = () => {
      if (!raf && runRef.current && !lost) {
        prev = 0;
        raf = requestAnimationFrame(draw);
      }
    };
    kickRef.current = kick;
    kick();
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      setLive(false);
    };
    cv.addEventListener('webglcontextlost', onLost);

    return () => {
      kickRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      cv.removeEventListener('webglcontextlost', onLost);
      ro?.disconnect();
      g.getExtension('WEBGL_lose_context')?.loseContext();
      setLive(false);
    };
  }, [reduced]);

  return (
    <div ref={wrap} className={`glass-fold ${live && !reduced ? 'is-live' : ''} ${className}`} aria-hidden="true">
      <div className="glass-fold-static" />
      {!reduced && <canvas ref={canvas} className="glass-fold-canvas" />}
    </div>
  );
}
