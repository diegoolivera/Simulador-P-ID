import { describe, expect, it } from 'vitest';
import {
  IDENTITY_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  panBy,
  screenToWorld,
  wheelZoomFactor,
  worldToScreen,
  zoomAt,
  type ViewportState,
} from './viewport';

const state = (scale: number, tx = 0, ty = 0): ViewportState => ({ scale, tx, ty });

describe('clampZoom', () => {
  it('leaves an in-range zoom untouched', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
  });

  it('clamps at both ends', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(MAX_ZOOM);
    expect(clampZoom(Number.NEGATIVE_INFINITY)).toBe(MIN_ZOOM);
  });

  it('collapses NaN to the identity factor instead of propagating it', () => {
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(Number.isFinite(clampZoom(Number.NaN))).toBe(true);
  });
});

describe('screenToWorld / worldToScreen', () => {
  it('round-trips a point through the transform', () => {
    const s = state(2, 30, -10);
    const world = { x: 12, y: 7 };
    const screen = worldToScreen(s, world);
    expect(screen).toEqual({ x: 54, y: 4 });
    const back = screenToWorld(s, screen);
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });

  it('sanitizes a corrupted viewport before dividing', () => {
    const out = screenToWorld(state(Number.NaN, Number.NaN, Number.NaN), { x: 5, y: 6 });
    expect(out).toEqual({ x: 5, y: 6 });
  });
});

describe('zoomAt', () => {
  it('keeps the world point under the pointer fixed (zoom toward the cursor)', () => {
    const before = state(1, 10, 20);
    const pointer = { x: 300, y: 150 };
    const world = screenToWorld(before, pointer);

    const after = zoomAt(before, pointer, 2);
    expect(after.scale).toBeCloseTo(2);
    const screenAfter = worldToScreen(after, world);
    expect(screenAfter.x).toBeCloseTo(pointer.x);
    expect(screenAfter.y).toBeCloseTo(pointer.y);
  });

  it('clamps at both ends', () => {
    expect(zoomAt(state(1), { x: 0, y: 0 }, 100).scale).toBe(MAX_ZOOM);
    expect(zoomAt(state(1), { x: 0, y: 0 }, 0.001).scale).toBe(MIN_ZOOM);
    expect(zoomAt(state(MAX_ZOOM), { x: 0, y: 0 }, 2).scale).toBe(MAX_ZOOM);
    expect(zoomAt(state(MIN_ZOOM), { x: 0, y: 0 }, 0.5).scale).toBe(MIN_ZOOM);
  });

  it('is a no-op for a zero or negative factor', () => {
    const before = state(1.5, 10, 20);
    expect(zoomAt(before, { x: 100, y: 100 }, 1)).toEqual(before);
    expect(zoomAt(before, { x: 100, y: 100 }, 0)).toEqual(before);
    expect(zoomAt(before, { x: 100, y: 100 }, -2)).toEqual(before);
  });

  it('never produces a non-finite transform for nonsense input', () => {
    const states = [
      state(Number.NaN, Number.NaN, Number.NaN),
      state(1, Number.NaN, 5),
      state(2, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
      state(0, 1, 2),
    ];
    const pointers = [
      { x: Number.NaN, y: 3 },
      { x: 10, y: Number.POSITIVE_INFINITY },
      { x: 1, y: 2 },
    ];
    const factors = [Number.NaN, Number.POSITIVE_INFINITY, 0, -1, 2];

    for (const s of states) {
      for (const pointer of pointers) {
        for (const factor of factors) {
          const out = zoomAt(s, pointer, factor);
          expect(Number.isFinite(out.scale)).toBe(true);
          expect(Number.isFinite(out.tx)).toBe(true);
          expect(Number.isFinite(out.ty)).toBe(true);
          expect(out.scale).toBeGreaterThanOrEqual(MIN_ZOOM);
          expect(out.scale).toBeLessThanOrEqual(MAX_ZOOM);
        }
      }
    }
  });
});

describe('panBy', () => {
  it('is a pure translation: scale unchanged, offsets shifted', () => {
    expect(panBy(state(1.5, 10, 20), 5, -3)).toEqual({ scale: 1.5, tx: 15, ty: 17 });
  });

  it('collapses non-finite deltas to zero', () => {
    expect(panBy(state(1, 1, 2), Number.NaN, Number.POSITIVE_INFINITY)).toEqual({ scale: 1, tx: 1, ty: 2 });
  });
});

describe('wheelZoomFactor', () => {
  it('is 1 for a zero delta', () => {
    expect(wheelZoomFactor(0)).toBe(1);
  });

  it('zooms in on scroll up and out on scroll down', () => {
    expect(wheelZoomFactor(-100)).toBeGreaterThan(1);
    expect(wheelZoomFactor(100)).toBeLessThan(1);
  });

  it('stays finite and positive for nonsense deltas', () => {
    for (const delta of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1e9, -1e9]) {
      const factor = wheelZoomFactor(delta);
      expect(Number.isFinite(factor)).toBe(true);
      expect(factor).toBeGreaterThan(0);
    }
  });
});

describe('IDENTITY_VIEWPORT', () => {
  it('is the fit-to-screen default', () => {
    expect(IDENTITY_VIEWPORT).toEqual({ scale: 1, tx: 0, ty: 0 });
  });
});

describe('item drag under zoom/pan', () => {
  it('tracks the cursor: an item moves by exactly the cursor world delta', () => {
    // Regression guard for the P&ID editor: the drag offset is captured in
    // world space (screenToWorld of the pointer), so the item must stay glued
    // to the cursor no matter how the canvas is zoomed or panned.
    const viewport = state(2.5, -120, 40);
    const itemStart = { x: 100, y: 80 };

    const pressRoot = { x: 400, y: 300 };
    const pressWorld = screenToWorld(viewport, pressRoot);
    const offset = { x: pressWorld.x - itemStart.x, y: pressWorld.y - itemStart.y };

    const moveRoot = { x: 430, y: 280 };
    const moveWorld = screenToWorld(viewport, moveRoot);
    const moved = { x: moveWorld.x - offset.x, y: moveWorld.y - offset.y };

    // The item's world displacement equals the pointer's world displacement...
    expect(moved.x - itemStart.x).toBeCloseTo(moveWorld.x - pressWorld.x);
    expect(moved.y - itemStart.y).toBeCloseTo(moveWorld.y - pressWorld.y);
    // ...which, in root/screen space, is the cursor delta scaled by 1/zoom.
    expect(moved.x - itemStart.x).toBeCloseTo((moveRoot.x - pressRoot.x) / viewport.scale);
    expect(moved.y - itemStart.y).toBeCloseTo((moveRoot.y - pressRoot.y) / viewport.scale);
  });
});
