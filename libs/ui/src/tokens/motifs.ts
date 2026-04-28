/**
 * Beach motif manifest — the iconography vocabulary derived from
 * `image_0.png`. Each motif maps to a stable id we can reference in CMS
 * fields, blog posts, gift-pack designs, and section dividers.
 *
 * SVG implementations live alongside this file in `../components/motifs/`
 * (added in Step 2). This manifest just declares the catalogue and which
 * brand colour each motif defaults to.
 */

import type { PaletteKey } from './colors';

export type MotifId =
  | 'wave'
  | 'surfboard'
  | 'palmTree'
  | 'spiral'
  | 'sun'
  | 'fish'
  | 'bird'
  | 'coral'
  | 'wordmarkSurf';

export interface MotifSpec {
  id: MotifId;
  label: string;
  defaultColor: PaletteKey;
  /** Suggested usage contexts in the UI. */
  contexts: Array<'hero' | 'divider' | 'pattern' | 'icon' | 'merch' | 'social'>;
}

export const motifs: Record<MotifId, MotifSpec> = {
  wave: {
    id: 'wave',
    label: 'Wave',
    defaultColor: 'oceanBlue',
    contexts: ['hero', 'divider', 'pattern'],
  },
  surfboard: {
    id: 'surfboard',
    label: 'Surfboard',
    defaultColor: 'coralRed',
    contexts: ['icon', 'merch'],
  },
  palmTree: {
    id: 'palmTree',
    label: 'Palm Tree',
    defaultColor: 'teal',
    contexts: ['hero', 'icon', 'merch'],
  },
  spiral: {
    id: 'spiral',
    label: 'Spiral Shell',
    defaultColor: 'oceanBlue',
    contexts: ['icon', 'pattern', 'merch'],
  },
  sun: {
    id: 'sun',
    label: 'Sun',
    defaultColor: 'sun',
    contexts: ['hero', 'icon', 'social'],
  },
  fish: {
    id: 'fish',
    label: 'Fish',
    defaultColor: 'teal',
    contexts: ['icon', 'pattern'],
  },
  bird: {
    id: 'bird',
    label: 'Sea Bird',
    defaultColor: 'oceanBlue',
    contexts: ['icon', 'pattern'],
  },
  coral: {
    id: 'coral',
    label: 'Coral',
    defaultColor: 'coralRed',
    contexts: ['icon', 'pattern'],
  },
  wordmarkSurf: {
    id: 'wordmarkSurf',
    label: 'SURF Wordmark',
    defaultColor: 'oceanBlue',
    contexts: ['hero', 'merch', 'social'],
  },
};
