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

const cardMemo = new Map<string, CardFit>();

export const rememberedCardFit = (url: string): CardFit | undefined => cardMemo.get(url);
export const rememberCardFit = (url: string, fit: CardFit) => void cardMemo.set(url, fit);
/** Tests only. */
export function forgetImageFits() {
  cardMemo.clear();
}
