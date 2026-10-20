/**
 * Whether a story photo is usable. Decisions are made from the natural size once the image has loaded (the feed data carries no
 * dimensions) and remembered per URL, so a card that remounts does not flash.
 *
 * Cards show the photo filling a fixed-ratio rounded frame (`object-fit: cover`) that sits fully inside the card. Only a broken or tiny
 * image (a feed icon or tracking pixel, blurry when stretched to the frame) is dropped; the text then takes the full card width.
 */
export type CardFit = 'ok' | 'hide';
/** Hero: `cover` fills the stage (wide, large, close to the stage's shape); `contain` shows the whole picture over a blurred copy; `art` drops it. */
export type HeroFit = 'cover' | 'contain' | 'art';

export interface NaturalSize {
  width: number;
  height: number;
}

export const CARD_MIN_WIDTH = 240;
export const CARD_MIN_HEIGHT = 120;

export const HERO_MIN_WIDTH = 480;
export const HERO_MIN_HEIGHT = 270;
export const HERO_COVER_MIN_WIDTH = 1000;
export const HERO_COVER_RATIO: readonly [number, number] = [1.45, 2.3];
export const HERO_MIN_RATIO = 0.8;
export const HERO_MAX_RATIO = 3.2;

export function judgeCardImage({ width, height }: NaturalSize): CardFit {
  if (!(width > 0 && height > 0)) return 'hide';
  return width < CARD_MIN_WIDTH || height < CARD_MIN_HEIGHT ? 'hide' : 'ok';
}

export function judgeHeroImage({ width, height }: NaturalSize): HeroFit {
  if (!(width > 0 && height > 0)) return 'art';
  if (width < HERO_MIN_WIDTH || height < HERO_MIN_HEIGHT) return 'art';
  const ratio = width / height;
  if (ratio < HERO_MIN_RATIO || ratio > HERO_MAX_RATIO) return 'art';
  if (width >= HERO_COVER_MIN_WIDTH && ratio >= HERO_COVER_RATIO[0] && ratio <= HERO_COVER_RATIO[1]) return 'cover';
  return 'contain';
}

const cardMemo = new Map<string, CardFit>();
const heroMemo = new Map<string, HeroFit>();

export const rememberedCardFit = (url: string): CardFit | undefined => cardMemo.get(url);
export const rememberedHeroFit = (url: string): HeroFit | undefined => heroMemo.get(url);
export const rememberCardFit = (url: string, fit: CardFit) => void cardMemo.set(url, fit);
export const rememberHeroFit = (url: string, fit: HeroFit) => void heroMemo.set(url, fit);
/** Tests only. */
export function forgetImageFits() {
  cardMemo.clear();
  heroMemo.clear();
}
