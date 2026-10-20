import { describe, expect, it } from 'vitest';
import { judgeBackgroundImage, judgeCardImage } from './imageFit';

describe('judgeCardImage', () => {
  it('keeps every photo big enough to fill the frame', () => {
    expect(judgeCardImage({ width: 1200, height: 675 })).toBe('ok');
    expect(judgeCardImage({ width: 640, height: 480 })).toBe('ok');
    expect(judgeCardImage({ width: 800, height: 800 })).toBe('ok');
    expect(judgeCardImage({ width: 500, height: 900 })).toBe('ok');
    expect(judgeCardImage({ width: 1500, height: 300 })).toBe('ok');
  });
  it('keeps tall and banner photos (the frame crops them) and drops tiny images and anything with no size', () => {
    expect(judgeCardImage({ width: 200, height: 150 })).toBe('hide');
    expect(judgeCardImage({ width: 600, height: 100 })).toBe('hide');
    expect(judgeCardImage({ width: 0, height: 0 })).toBe('hide');
  });
});

describe('judgeBackgroundImage', () => {
  it('accepts big landscape photos', () => {
    expect(judgeBackgroundImage({ width: 1600, height: 900 })).toBe(true);
    expect(judgeBackgroundImage({ width: 1200, height: 675 })).toBe(true);
    expect(judgeBackgroundImage({ width: 2400, height: 1000 })).toBe(true);
  });
  it('rejects small, boxy, portrait, banner and unknown-size photos', () => {
    expect(judgeBackgroundImage({ width: 800, height: 450 })).toBe(false);
    expect(judgeBackgroundImage({ width: 1000, height: 800 })).toBe(false);
    expect(judgeBackgroundImage({ width: 900, height: 1600 })).toBe(false);
    expect(judgeBackgroundImage({ width: 3000, height: 1000 })).toBe(false);
    expect(judgeBackgroundImage({ width: 0, height: 0 })).toBe(false);
  });
});
