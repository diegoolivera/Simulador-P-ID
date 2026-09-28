import { describe, expect, it } from 'vitest';
import { MAX_SCALE, MIN_SCALE, clampScale, resizeHandleOffset, scaleFromDrag } from './resize';

describe('clampScale', () => {
  it('leaves an in-range scale untouched', () => {
    expect(clampScale(1)).toBe(1);
    expect(clampScale(2.25)).toBe(2.25);
  });

  it('clamps at both ends', () => {
    expect(clampScale(0.1)).toBe(MIN_SCALE);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(MAX_SCALE);
    expect(clampScale(Number.NEGATIVE_INFINITY)).toBe(MIN_SCALE);
  });

  it('collapses NaN to a finite minimum instead of propagating it', () => {
    expect(clampScale(Number.NaN)).toBe(MIN_SCALE);
    expect(Number.isFinite(clampScale(Number.NaN))).toBe(true);
  });
});

describe('scaleFromDrag', () => {
  it('scales proportionally to the drag distance', () => {
    // Dragging twice as far from the centre doubles the scale.
    expect(scaleFromDrag(1, 20, 40)).toBeCloseTo(2);
    expect(scaleFromDrag(1.5, 20, 10)).toBeCloseTo(0.75);
  });

  it('returns the start scale unchanged when the start distance is zero (no division by zero)', () => {
    expect(scaleFromDrag(2, 0, 50)).toBe(2);
    expect(Number.isFinite(scaleFromDrag(2, 0, 50))).toBe(true);
  });

  it('returns the start scale for negative or non-finite start distances', () => {
    expect(scaleFromDrag(1.2, -5, 10)).toBe(1.2);
    expect(scaleFromDrag(1.2, Number.NaN, 10)).toBe(1.2);
  });

  it('clamps at both ends', () => {
    expect(scaleFromDrag(1, 20, 1)).toBe(MIN_SCALE);
    expect(scaleFromDrag(1, 20, 10_000)).toBe(MAX_SCALE);
  });

  it('is monotonic: more drag never produces a smaller scale', () => {
    const samples = [5, 10, 20, 40, 80, 160].map((d) => scaleFromDrag(1, 20, d));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
  });

  it('stays finite for absurd inputs', () => {
    for (const [start, from, to] of [
      [Number.NaN, 20, 40],
      [1, Number.NaN, 40],
      [1, 20, Number.NaN],
      [1, 20, Number.POSITIVE_INFINITY],
      [Number.POSITIVE_INFINITY, 20, 40],
      [-3, 20, 40],
    ]) {
      const result = scaleFromDrag(start, from, to);
      expect(Number.isFinite(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(MIN_SCALE);
      expect(result).toBeLessThanOrEqual(MAX_SCALE);
    }
  });
});

describe('resizeHandleOffset', () => {
  it('places the handle clear of the vessel glyph and its label', () => {
    // Vessel ellipse is rx=32 ry=20 and the tag label sits at y=30.
    const { dx, dy } = resizeHandleOffset('vessel', 1);
    expect(dx).toBeGreaterThan(32);
    expect(dy).toBeGreaterThan(30);
  });

  it('clears the tallest glyph (tank: 44x52 rect with label at y=38)', () => {
    const { dx, dy } = resizeHandleOffset('tank', 1);
    expect(dx).toBeGreaterThan(22);
    expect(dy).toBeGreaterThan(38);
  });

  it('scales the offset with the item so the handle stays attached', () => {
    const one = resizeHandleOffset('vessel', 1);
    const two = resizeHandleOffset('vessel', 2);
    expect(two.dx).toBeCloseTo(one.dx * 2);
    expect(two.dy).toBeCloseTo(one.dy * 2);
  });

  it('falls back to a finite offset for an unknown symbol or bad scale', () => {
    const { dx, dy } = resizeHandleOffset('mystery', Number.NaN);
    expect(Number.isFinite(dx)).toBe(true);
    expect(Number.isFinite(dy)).toBe(true);
    expect(dx).toBeGreaterThan(0);
  });
});
