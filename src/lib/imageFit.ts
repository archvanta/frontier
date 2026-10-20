/**
 * Whether a story photo can be shown whole at a reasonable size. Decisions are made from the natural size once the image has loaded
 * (the feed data carries no dimensions) and remembered per URL, so a card that remounts does not flash.
 *
 * Cards show the photo inside a fixed 16:9 frame with `object-fit: contain`, never cropped. A photo that would end up tiny or a thin
 * strip in that frame (small, very tall, or a banner) is dropped and the text takes the full card width.
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
export const CARD_MIN_RATIO = 1;
export const CARD_MAX_RATIO = 3;

export const HERO_MIN_WIDTH = 480;
export const HERO_MIN_HEIGHT = 270;
export const HERO_COVER_MIN_WIDTH = 1000;
export const HERO_COVER_RATIO: readonly [number, number] = [1.45, 2.3];
export const HERO_MIN_RATIO = 0.8;
export const HERO_MAX_RATIO = 3.2;

export function judgeCardImage({ width, height }: NaturalSize): CardFit {
  if (!(width > 0 && height > 0)) return 'hide';
  if (width < CARD_MIN_WIDTH || height < CARD_MIN_HEIGHT) return 'hide';
  const ratio = width / height;
  return ratio < CARD_MIN_RATIO || ratio > CARD_MAX_RATIO ? 'hide' : 'ok';
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
