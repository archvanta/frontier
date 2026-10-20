import type { IconName } from '../components/Icon';
import type { CategoryId } from './types';

/** Gradient family of a story card (`data-tone`); the gradients themselves are tokens in styles/tokens.css. */
export type Tone = 'violet' | 'blue' | 'indigo' | 'teal' | 'crimson' | 'lime';

const TONES: Record<CategoryId, Tone> = {
  models: 'violet',
  research: 'blue',
  products: 'indigo',
  business: 'teal',
  policy: 'crimson',
  'open-source': 'teal',
  hardware: 'indigo',
  safety: 'crimson',
};

const ICONS: Record<CategoryId, IconName> = {
  models: 'sparkle',
  research: 'flask',
  products: 'box',
  business: 'trend',
  policy: 'scale',
  'open-source': 'code',
  hardware: 'chip',
  safety: 'shield',
};

export const toneFor = (category: CategoryId): Tone => TONES[category] ?? 'violet';
export const categoryIcon = (category: CategoryId): IconName => ICONS[category] ?? 'sparkle';
