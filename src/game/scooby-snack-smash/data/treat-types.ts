/**
 * Treat Bubble Types — 5 distinct types for Scooby Snack Smash.
 *
 * Each type must be visually distinguishable:
 * - color + shape + icon (never color alone, per UX colorblind rule)
 * - emoji fallbacks used until atlas is shipped
 */

export type TreatType = 'scooby-snack' | 'sandwich' | 'bone' | 'pizza' | 'cupcake';

export interface TreatTypeDef {
  id: TreatType;
  /** Emoji fallback when atlas is not loaded */
  emoji: string;
  /** Display name for accessibility */
  label: string;
  /** Tint color (hex) for tinted sprite fallback */
  tint: number;
}

export const TREAT_TYPES: TreatTypeDef[] = [
  { id: 'scooby-snack', emoji: '🍖', label: 'Scooby Snack', tint: 0xf5a623 },
  { id: 'sandwich',     emoji: '🥪', label: 'Sandwich',     tint: 0xf0e040 },
  { id: 'bone',         emoji: '🦴', label: 'Bone',         tint: 0xe8e8e8 },
  { id: 'pizza',        emoji: '🍕', label: 'Pizza',        tint: 0xe84040 },
  { id: 'cupcake',      emoji: '🧁', label: 'Cupcake',      tint: 0xe070c8 },
];

export const TREAT_TYPE_IDS: TreatType[] = TREAT_TYPES.map(t => t.id);

export function getTreatDef(id: TreatType): TreatTypeDef {
  const def = TREAT_TYPES.find(t => t.id === id);
  if (!def) throw new Error(`Unknown treat type: ${id}`);
  return def;
}
