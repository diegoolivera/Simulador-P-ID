import { describe, expect, it } from 'vitest';
import { reconcileLayout, validateStoredLayout } from './layoutStorage';

const item = { x: 10, y: 20, rotation: 0, symbol: 'vessel' };

describe('validateStoredLayout', () => {
  it('accepts a well-formed layout', () => {
    const result = validateStoredLayout({ items: { 'SB-001': item }, edges: [{ id: 'e1', from: 'A', to: 'B' }] });
    expect(result).not.toBeNull();
    expect(result!.items['SB-001']).toEqual(item);
    expect(result!.edges).toEqual([{ id: 'e1', from: 'A', to: 'B' }]);
  });

  it('keeps an optional scale when present', () => {
    const result = validateStoredLayout({ items: { 'SB-001': { ...item, scale: 1.5 } }, edges: [] });
    expect(result!.items['SB-001'].scale).toBe(1.5);
  });

  it('drops a malformed item but keeps the rest of the arrangement', () => {
    const result = validateStoredLayout({
      items: {
        'SB-001': item,
        'BROKEN': { y: 20, rotation: 0, symbol: 'vessel' },
        'SB-004': { x: 1150, y: 370, rotation: 0, symbol: 'vessel' },
      },
      edges: [],
    });
    expect(result).not.toBeNull();
    expect(result!.items['SB-001']).toEqual(item);
    expect(result!.items['SB-004']).toEqual({ x: 1150, y: 370, rotation: 0, symbol: 'vessel' });
    expect(result!.items['BROKEN']).toBeUndefined();
  });

  it('drops an item with non-finite coordinates instead of the whole layout', () => {
    const result = validateStoredLayout({
      items: { 'SB-001': item, 'BAD-X': { ...item, x: Number.NaN }, 'BAD-Y': { ...item, y: Number.POSITIVE_INFINITY } },
      edges: [],
    });
    expect(result!.items['SB-001']).toEqual(item);
    expect(result!.items['BAD-X']).toBeUndefined();
    expect(result!.items['BAD-Y']).toBeUndefined();
  });

  it('drops an item with an empty symbol instead of the whole layout', () => {
    const result = validateStoredLayout({ items: { 'SB-001': item, 'BAD': { ...item, symbol: '' } }, edges: [] });
    expect(result!.items['SB-001']).toEqual(item);
    expect(result!.items['BAD']).toBeUndefined();
  });

  it('falls back to null when no item survives', () => {
    expect(validateStoredLayout({ items: { 'BAD': { y: 20, symbol: 'vessel' } }, edges: [] })).toBeNull();
    expect(validateStoredLayout({ items: {}, edges: [] })).toBeNull();
  });

  it('rejects a non-object items map', () => {
    expect(validateStoredLayout({ items: null, edges: [] })).toBeNull();
    expect(validateStoredLayout({ items: [], edges: [] })).toBeNull();
    expect(validateStoredLayout(null)).toBeNull();
  });

  it('defaults rotation to 0 when it is missing or not finite', () => {
    const result = validateStoredLayout({ items: { 'SB-001': { x: 1, y: 2, symbol: 'vessel' } }, edges: [] });
    expect(result!.items['SB-001'].rotation).toBe(0);
  });

  it('clamps a stored scale to the same range the UI enforces', () => {
    const result = validateStoredLayout({
      items: { 'TOO-BIG': { ...item, scale: 100 }, 'TOO-SMALL': { ...item, scale: 0 } },
      edges: [],
    });
    expect(result!.items['TOO-BIG'].scale).toBe(3);
    expect(result!.items['TOO-SMALL'].scale).toBe(0.5);
  });

  it('drops malformed edges instead of failing the whole layout', () => {
    const result = validateStoredLayout({ items: { 'SB-001': item }, edges: [{ id: 'ok', from: 'A', to: 'B' }, { id: 3 }] });
    expect(result!.edges).toEqual([{ id: 'ok', from: 'A', to: 'B' }]);
  });

  it('preserves an edge kind and valveTag, and leaves a legacy edge kind-less', () => {
    const result = validateStoredLayout({
      items: { 'SB-001': item },
      edges: [
        { id: 'valved', from: 'A', to: 'B', kind: 'valved', valveTag: 'V-NEW-1' },
        { id: 'legacy', from: 'B', to: 'C' },
        { id: 'bogus', from: 'C', to: 'D', kind: 'nonsense' },
      ],
    });
    expect(result!.edges[0]).toEqual({ id: 'valved', from: 'A', to: 'B', kind: 'valved', valveTag: 'V-NEW-1' });
    expect(result!.edges[1]).toEqual({ id: 'legacy', from: 'B', to: 'C' });
    expect(result!.edges[2]).toEqual({ id: 'bogus', from: 'C', to: 'D' });
  });
});

describe('reconcileLayout', () => {
  const template = { 'SB-001': { x: 1, y: 2, rotation: 0, symbol: 'slug-catcher-vessel' } };

  it('takes the symbol from the template, so a stale layout cannot keep drawing the old glyph', () => {
    // Arranged back when SB-001 was still the generic ellipse. Without this the
    // operator would never see a symbol change: the stored layout wins.
    const stored = { 'SB-001': { x: 480, y: 320, rotation: 0, symbol: 'vessel' } };
    expect(reconcileLayout(stored, template)['SB-001'].symbol).toBe('slug-catcher-vessel');
  });

  it('keeps the operator position, rotation and scale for a template tag', () => {
    const stored = { 'SB-001': { x: 999, y: 888, rotation: 90, symbol: 'vessel', scale: 2 } };
    expect(reconcileLayout(stored, template)['SB-001']).toEqual({
      x: 999,
      y: 888,
      rotation: 90,
      symbol: 'slug-catcher-vessel',
      scale: 2,
    });
  });

  it('uses the template defaults when the tag has never been arranged', () => {
    expect(reconcileLayout(undefined, template)['SB-001']).toEqual(template['SB-001']);
  });

  it('keeps a stored symbol for a tag the template does not define', () => {
    // A palette-added item is not part of the plant, so its identity is the operator's.
    const stored = { 'VALVE-1': { x: 5, y: 6, rotation: 0, symbol: 'valve' } };
    expect(reconcileLayout(stored, template)['VALVE-1']).toEqual(stored['VALVE-1']);
  });

  it('does not invent items present in neither source', () => {
    expect(Object.keys(reconcileLayout({}, {}))).toEqual([]);
  });
});
