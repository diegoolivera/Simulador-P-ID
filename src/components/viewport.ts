/**
 * Pure viewport (zoom/pan) geometry for the P&ID canvas.
 *
 * The whole drawing lives inside one SVG group rendered with
 * `transform="translate(tx ty) scale(scale)"`. A *world* point `w` — the
 * coordinates every layout item stores — therefore maps to a *root* point
 * `p = w * scale + t` in the SVG's own viewBox space, and back with
 * `w = (p - t) / scale`.
 *
 * Like `resize.ts`, this is plain functions on purpose: jsdom has no
 * `createSVGPoint`/`getScreenCTM`, so the coordinate maths cannot be exercised
 * through the DOM. Keeping it here lets the clamping and cursor-anchored zoom
 * be unit-tested directly, with the event handlers left as thin adapters.
 */

export interface Point {
  x: number;
  y: number;
}

export interface ViewportState {
  /** Zoom factor, always inside [MIN_ZOOM, MAX_ZOOM]. */
  scale: number;
  /** Translation in root-viewBox units. */
  tx: number;
  ty: number;
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

/** Identity viewport: the template's viewBox already fits the canvas at 100%. */
export const IDENTITY_VIEWPORT: ViewportState = { scale: 1, tx: 0, ty: 0 };

/** Wheel deltaY -> multiplicative zoom factor. Scroll up (negative) zooms in. */
export const WHEEL_ZOOM_SENSITIVITY = 0.0015;
/** Per-event delta cap so a coarse mouse wheel cannot jump across the range. */
const MAX_WHEEL_DELTA = 200;

const isFinitePoint = (p: Point): boolean => Number.isFinite(p.x) && Number.isFinite(p.y);

/**
 * Clamp a zoom factor into the range the UI enforces. NaN collapses to the
 * identity factor so a corrupted value can never produce a NaN transform;
 * infinities clamp to the nearest end of the range.
 */
export function clampZoom(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

/** Repair a viewport so every field is a finite number before it is used. */
export function sanitizeViewport(state: ViewportState): ViewportState {
  return {
    scale: clampZoom(state.scale),
    tx: Number.isFinite(state.tx) ? state.tx : 0,
    ty: Number.isFinite(state.ty) ? state.ty : 0,
  };
}

/** Root-viewBox point -> world point. */
export function screenToWorld(state: ViewportState, point: Point): Point {
  const { scale, tx, ty } = sanitizeViewport(state);
  return { x: (point.x - tx) / scale, y: (point.y - ty) / scale };
}

/** World point -> root-viewBox point. */
export function worldToScreen(state: ViewportState, point: Point): Point {
  const { scale, tx, ty } = sanitizeViewport(state);
  return { x: point.x * scale + tx, y: point.y * scale + ty };
}

/**
 * Zoom by a multiplicative `factor`, keeping the world point currently under
 * `pointer` fixed (i.e. zoom toward the cursor, not the canvas centre).
 *
 * Nonsense input — a non-finite factor/pointer or a zero/negative factor —
 * returns the sanitized state unchanged, so a bad wheel event can never leave
 * the canvas with a non-finite transform.
 */
export function zoomAt(state: ViewportState, pointer: Point, factor: number): ViewportState {
  const base = sanitizeViewport(state);
  if (!Number.isFinite(factor) || factor <= 0) return base;
  if (!isFinitePoint(pointer)) return base;
  const scale = clampZoom(base.scale * factor);
  const ratio = scale / base.scale;
  return {
    scale,
    tx: pointer.x - (pointer.x - base.tx) * ratio,
    ty: pointer.y - (pointer.y - base.ty) * ratio,
  };
}

/**
 * Pure translation of the canvas. Non-finite deltas collapse to zero so a
 * stray event cannot poison the transform.
 */
export function panBy(state: ViewportState, dx: number, dy: number): ViewportState {
  const base = sanitizeViewport(state);
  const ddx = Number.isFinite(dx) ? dx : 0;
  const ddy = Number.isFinite(dy) ? dy : 0;
  return { scale: base.scale, tx: base.tx + ddx, ty: base.ty + ddy };
}

/** Wheel deltaY -> multiplicative zoom factor (scroll up = zoom in). */
export function wheelZoomFactor(deltaY: number): number {
  if (!Number.isFinite(deltaY)) return 1;
  const clamped = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, deltaY));
  return Math.exp(-clamped * WHEEL_ZOOM_SENSITIVITY);
}
