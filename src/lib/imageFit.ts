/**
 * Whether a story photo is usable. Decisions are made from the natural size once the image has loaded (the feed data carries no
 * dimensions) and remembered per URL, so a card that remounts does not flash.
 *
 * Cards and the homepage hero show the photo filling a fixed-ratio rounded frame (`object-fit: cover`). Only a broken or tiny image (a feed
 * icon or tracking pixel, blurry when stretched to the frame) is dropped: a card then takes the full width for its text, the hero keeps its
 * frame with a placeholder.
 */
export type CardFit = 'ok' | 'hide';

export interface NaturalSize {
  width: number;
  height: number;
}

export const CARD_MIN_WIDTH = 240;
export const CARD_MIN_HEIGHT = 120;

export function judgeCardImage({ width, height }: NaturalSize): CardFit {
  if (!(width > 0 && height > 0)) return 'hide';
  return width < CARD_MIN_WIDTH || height < CARD_MIN_HEIGHT ? 'hide' : 'ok';
}

/**
 * A photo may also be the slide background of the homepage carousel when it is big and landscape enough to fill a wide stage without
 * stretching or cropping most of it away. Anything else keeps only the framed photo (and the plain gradient behind the slide).
 */
export const BG_MIN_WIDTH = 1000;
export const BG_MIN_HEIGHT = 520;
export const BG_MIN_RATIO = 1.45;
export const BG_MAX_RATIO = 2.4;

export function judgeBackgroundImage({ width, height }: NaturalSize): boolean {
  if (!(width >= BG_MIN_WIDTH && height >= BG_MIN_HEIGHT)) return false;
  const ratio = width / height;
  return ratio >= BG_MIN_RATIO && ratio <= BG_MAX_RATIO;
}

const cardMemo = new Map<string, CardFit>();
const backgroundMemo = new Map<string, boolean>();

export const rememberedBackground = (url: string): boolean | undefined => backgroundMemo.get(url);
export const rememberBackground = (url: string, ok: boolean) => void backgroundMemo.set(url, ok);

export const rememberedCardFit = (url: string): CardFit | undefined => cardMemo.get(url);
export const rememberCardFit = (url: string, fit: CardFit) => void cardMemo.set(url, fit);
/** Tests only. */
export function forgetImageFits() {
  cardMemo.clear();
  backgroundMemo.clear();
}
