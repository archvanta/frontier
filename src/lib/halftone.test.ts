import { describe, expect, it } from 'vitest';
import { dotRadius, fitSize, parseHex, stepDot, warmth } from './halftone';

describe('halftone helpers', () => {
  it('parses hex colours', () => {
    expect(parseHex('#c6ff4a')).toEqual([198, 255, 74]);
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('rgb(1,2,3)')).toBeNull();
  });
  it('sizes dots by coverage', () => {
    expect(dotRadius(0, 6)).toBe(0);
    expect(dotRadius(1, 6)).toBeCloseTo(3.36);
    expect(dotRadius(4, 6)).toBe(dotRadius(1, 6));
    expect(dotRadius(0.25, 6)).toBeCloseTo(dotRadius(1, 6) / 2);
  });
  it('pushes a dot away from the pointer and lets a displaced dot settle home', () => {
    const [x] = stepDot(10, 10, 0, 0, 10, 10, 5, 10, 40);
    expect(x).toBeGreaterThan(10);
    let s: [number, number, number, number] = [30, 20, 0, 0];
    for (let i = 0; i < 300; i++) s = stepDot(s[0], s[1], s[2], s[3], 10, 10, -1e5, -1e5, 40);
    expect(s[0]).toBeCloseTo(10, 2);
    expect(s[1]).toBeCloseTo(10, 2);
  });
  it('warms with distance and fits text to a width', () => {
    expect(warmth(0, 0, 0, 0, 28)).toBe(0);
    expect(warmth(100, 0, 0, 0, 28)).toBe(1);
    expect(fitSize(200, 400)).toBe(200);
    expect(fitSize(0, 400)).toBe(0);
  });
});
