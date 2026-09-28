/**
 * Pure geometry for the P&ID edit-mode resize handle.
 *
 * jsdom has no `createSVGPoint`/`getScreenCTM`, so the pointer maths cannot be
 * exercised through the DOM. Keeping it here as plain functions lets the
 * coordinate and clamping behaviour be unit-tested directly, with the event
 * handler left as a thin adapter that only converts the pointer and commits.
 */

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 3;

/**
 * Clamp a scale into the range the UI enforces. Non-finite input collapses to
 * MIN_SCALE so a corrupted layout can never produce a NaN transform.
 */
export function clampScale(value: number): number {
  if (Number.isNaN(value)) return MIN_SCALE;
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, value));
}

/**
 * Scale produced by dragging the resize handle from `startDistance` to
 * `currentDistance`, where distances are measured from the item centre.
 *
 * Returns the starting scale unchanged when `startDistance` is not positive
 * (division by zero), and always returns a finite, clamped value.
 */
export function scaleFromDrag(startScale: number, startDistance: number, currentDistance: number): number {
  if (!(startDistance > 0)) return clampScale(startScale);
  return clampScale(startScale * (currentDistance / startDistance));
}

interface SymbolBounds {
  /** Half-width of the drawn glyph. */
  halfWidth: number;
  /** Half-height of the drawn glyph. */
  halfHeight: number;
  /** Distance from the centre to the bottom of the tag label. */
  labelY: number;
}

// Mirrors the shapes in Vessel.tsx so the handle clears the glyph and its label.
const SYMBOL_BOUNDS: Record<string, SymbolBounds> = {
  well: { halfWidth: 16, halfHeight: 16, labelY: 30 },
  manifold: { halfWidth: 26, halfHeight: 14, labelY: 30 },
  vessel: { halfWidth: 32, halfHeight: 20, labelY: 30 },
  sink: { halfWidth: 18, halfHeight: 14, labelY: 30 },
  flame: { halfWidth: 10, halfHeight: 22, labelY: 30 },
  tank: { halfWidth: 22, halfHeight: 26, labelY: 38 },
  transmitter: { halfWidth: 14, halfHeight: 14, labelY: 26 },
  controller: { halfWidth: 18, halfHeight: 12, labelY: 26 },
  pump: { halfWidth: 12, halfHeight: 12, labelY: 30 },
  compressor: { halfWidth: 14, halfHeight: 10, labelY: 30 },
  source: { halfWidth: 12, halfHeight: 12, labelY: 30 },
  header: { halfWidth: 30, halfHeight: 10, labelY: 30 },
  junction: { halfWidth: 10, halfHeight: 10, labelY: 30 },
  valve: { halfWidth: 14, halfHeight: 14, labelY: 24 },
  'slug-catcher-vessel': { halfWidth: 49, halfHeight: 28, labelY: 46 },
  'slug-catcher-fingers': { halfWidth: 50, halfHeight: 26, labelY: 44 },
  desander: { halfWidth: 24, halfHeight: 44, labelY: 56 },
  scrubber: { halfWidth: 24, halfHeight: 46, labelY: 50 },
  separator: { halfWidth: 44, halfHeight: 24, labelY: 42 },
};

const FALLBACK_BOUNDS: SymbolBounds = { halfWidth: 18, halfHeight: 18, labelY: 30 };
const HANDLE_MARGIN = 8;

/**
 * Offset from an item centre to the centre of its resize handle. Derived from
 * the symbol so the handle never lands on top of the glyph (which used to steal
 * the lower-right drag of a vessel/tank) and scaled with the item so it stays
 * attached as the item grows.
 */
export function resizeHandleOffset(symbol: string, scale = 1): { dx: number; dy: number } {
  const bounds = SYMBOL_BOUNDS[symbol] ?? FALLBACK_BOUNDS;
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    dx: (bounds.halfWidth + HANDLE_MARGIN) * s,
    dy: (Math.max(bounds.halfHeight, bounds.labelY) + HANDLE_MARGIN) * s,
  };
}
