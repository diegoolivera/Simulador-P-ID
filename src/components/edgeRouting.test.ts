import { describe, expect, it } from 'vitest';
import { edgeSegments } from './edgeRouting';
import type { PlantEdge } from '../types/plant';

const makeEdge = (overrides: Partial<PlantEdge> = {}): PlantEdge => ({
  id: 'edge',
  from: 'A',
  to: 'B',
  kind: 'valved',
  conductance: 1,
  ...overrides,
});

const ITEMS = {
  A: { x: 0, y: 0 },
  B: { x: 100, y: 0 },
  V: { x: 40, y: 0 },
};

describe('edgeSegments', () => {
  it('routes a valved edge through its valve item as two segments', () => {
    expect(edgeSegments(makeEdge({ valveTag: 'V' }), ITEMS)).toEqual([
      { from: { x: 0, y: 0 }, to: { x: 40, y: 0 } },
      { from: { x: 40, y: 0 }, to: { x: 100, y: 0 } },
    ]);
  });

  it('routes a control edge through its valve item as two segments', () => {
    const segments = edgeSegments(makeEdge({ kind: 'control', valveTag: 'V' }), ITEMS);
    expect(segments).toHaveLength(2);
    expect(segments![0].to).toEqual({ x: 40, y: 0 });
    expect(segments![1].from).toEqual({ x: 40, y: 0 });
  });

  it('falls back to one straight segment when the named valve has no item', () => {
    expect(edgeSegments(makeEdge({ valveTag: 'MISSING' }), ITEMS)).toEqual([
      { from: { x: 0, y: 0 }, to: { x: 100, y: 0 } },
    ]);
  });

  it('does not route when the valve tag is already an endpoint of the edge', () => {
    expect(edgeSegments(makeEdge({ from: 'V', valveTag: 'V' }), ITEMS)).toEqual([
      { from: { x: 40, y: 0 }, to: { x: 100, y: 0 } },
    ]);
  });

  it('draws a plain edge with no valve as one straight segment', () => {
    expect(edgeSegments(makeEdge({ kind: 'pipe' }), ITEMS)).toEqual([
      { from: { x: 0, y: 0 }, to: { x: 100, y: 0 } },
    ]);
  });

  it('returns null when an equipment endpoint is absent from the template', () => {
    expect(edgeSegments(makeEdge({ to: 'GONE', valveTag: 'V' }), ITEMS)).toBeNull();
  });
});
