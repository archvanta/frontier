import { describe, expect, it } from 'vitest';
import { judgeCardImage, judgeHeroImage } from './imageFit';

describe('judgeCardImage', () => {
  it('keeps ordinary landscape photos', () => {
    expect(judgeCardImage({ width: 1200, height: 675 })).toBe('ok');
    expect(judgeCardImage({ width: 640, height: 480 })).toBe('ok');
    expect(judgeCardImage({ width: 800, height: 800 })).toBe('ok');
  });
  it('drops tiny, tall and banner images and anything with no size', () => {
    expect(judgeCardImage({ width: 200, height: 150 })).toBe('hide');
    expect(judgeCardImage({ width: 600, height: 100 })).toBe('hide');
    expect(judgeCardImage({ width: 500, height: 900 })).toBe('hide');
    expect(judgeCardImage({ width: 1500, height: 300 })).toBe('hide');
    expect(judgeCardImage({ width: 0, height: 0 })).toBe('hide');
  });
});

describe('judgeHeroImage', () => {
  it('covers the stage only with a wide, large photo close to its shape', () => {
    expect(judgeHeroImage({ width: 1600, height: 900 })).toBe('cover');
    expect(judgeHeroImage({ width: 1200, height: 630 })).toBe('cover');
  });
  it('shows everything else whole over a blurred copy', () => {
    expect(judgeHeroImage({ width: 900, height: 1100 })).toBe('contain');
    expect(judgeHeroImage({ width: 800, height: 600 })).toBe('contain');
    expect(judgeHeroImage({ width: 700, height: 700 })).toBe('contain');
    expect(judgeHeroImage({ width: 2400, height: 800 })).toBe('contain');
  });
  it('drops images that are too small or extreme to show at this size', () => {
    expect(judgeHeroImage({ width: 300, height: 200 })).toBe('art');
    expect(judgeHeroImage({ width: 500, height: 900 })).toBe('art');
    expect(judgeHeroImage({ width: 2400, height: 400 })).toBe('art');
    expect(judgeHeroImage({ width: 0, height: 0 })).toBe('art');
  });
});
