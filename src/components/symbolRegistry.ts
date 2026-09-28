import type { PlantNode } from '../types/plant';

/**
 * Every symbol the `Vessel` component knows how to draw.
 *
 * A symbol missing from this list renders nothing (the `switch` in Vessel.tsx
 * falls through to `null`), which is exactly the silent failure this registry
 * exists to prevent. Keep it in sync with that `switch`.
 */
export const EQUIPMENT_SYMBOLS = [
  'well',
  'manifold',
  'vessel',
  'tank',
  'transmitter',
  'controller',
  'pump',
  'compressor',
  'source',
  'sink',
  'header',
  'flame',
  'junction',
  'slug-catcher-vessel',
  'slug-catcher-fingers',
  'desander',
  'scrubber',
  'separator',
] as const;

export type EquipmentSymbol = (typeof EQUIPMENT_SYMBOLS)[number];

/** The valve glyph is drawn by `Valve.tsx`, not `Vessel.tsx`. */
export const VALVE_SYMBOL = 'valve';

export interface PaletteItem {
  symbol: string;
  label: string;
}

/** Components the operator can drop onto the canvas, in palette order. */
export const PALETTE_ITEMS: PaletteItem[] = [
  { symbol: 'well', label: 'Pozo' },
  { symbol: 'manifold', label: 'Manifold' },
  { symbol: 'vessel', label: 'Vaso' },
  { symbol: 'tank', label: 'Tanque' },
  { symbol: 'valve', label: 'Válvula' },
  { symbol: 'transmitter', label: 'Transmisor' },
  { symbol: 'controller', label: 'Controlador' },
  { symbol: 'pump', label: 'Bomba' },
  { symbol: 'compressor', label: 'Compresor' },
  { symbol: 'source', label: 'Fuente' },
  { symbol: 'sink', label: 'Sumidero' },
  { symbol: 'header', label: 'Header' },
  { symbol: 'flame', label: 'Flare' },
  { symbol: 'slug-catcher-vessel', label: 'Slug catcher (vasija)' },
  { symbol: 'slug-catcher-fingers', label: 'Slug catcher (dedos)' },
  { symbol: 'desander', label: 'Desarenador' },
  { symbol: 'scrubber', label: 'Scrubber' },
  { symbol: 'separator', label: 'Separador' },
];

/**
 * `PlantNode` kind for a palette symbol. A `null` return means the item would
 * be dropped as a non-interactive glyph, so every `PALETTE_ITEMS` symbol must
 * map to a kind. Physical equipment is modelled as a `vessel` node; instruments
 * are pass-through `junction` nodes (the plant graph has no instrument kind).
 */
const KIND_BY_SYMBOL: Record<string, PlantNode['kind']> = {
  well: 'source',
  source: 'source',
  vessel: 'vessel',
  tank: 'vessel',
  'slug-catcher-vessel': 'vessel',
  'slug-catcher-fingers': 'vessel',
  desander: 'vessel',
  scrubber: 'vessel',
  separator: 'vessel',
  pump: 'vessel',
  compressor: 'vessel',
  sink: 'sink',
  flame: 'sink',
  manifold: 'header',
  header: 'header',
  junction: 'junction',
  transmitter: 'junction',
  controller: 'junction',
};

export function kindForSymbol(symbol: string): PlantNode['kind'] | null {
  return KIND_BY_SYMBOL[symbol] ?? null;
}

/** True when the canvas can draw something for this symbol. */
export function isRenderableSymbol(symbol: string): boolean {
  return symbol === VALVE_SYMBOL || (EQUIPMENT_SYMBOLS as readonly string[]).includes(symbol);
}
