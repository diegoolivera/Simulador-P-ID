import type { PlantTemplate } from '../data/templates';
import { clampScale } from './resize';

export type LayoutItem = { x: number; y: number; rotation: number; symbol: string; scale?: number };

export type StoredEdgeKind = 'pipe' | 'valved' | 'control';

export interface StoredEdge {
  id: string;
  from: string;
  to: string;
  /** Absent on layouts saved before edges carried their kind; treated as pipe. */
  kind?: StoredEdgeKind;
  valveTag?: string;
}

export interface StoredLayout {
  items: Record<string, LayoutItem>;
  edges: StoredEdge[];
}

export const layoutKey = (template: PlantTemplate) => `sbp-layout-${template}`;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const EDGE_KINDS: StoredEdgeKind[] = ['pipe', 'valved', 'control'];

/**
 * Validates a persisted layout before it reaches the canvas. Malformed entries
 * are dropped one by one — a single bad item must not discard an operator's
 * whole arrangement, the same way malformed edges are already filtered. Only
 * when nothing survives does the caller fall back to the template defaults
 * (returning null). The fallback is silent on purpose — there is nothing
 * actionable for the operator to see.
 */
export function validateStoredLayout(value: unknown): StoredLayout | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { items, edges } = value as { items?: unknown; edges?: unknown };
  if (!items || typeof items !== 'object' || Array.isArray(items)) return null;

  const validatedItems: Record<string, LayoutItem> = {};
  for (const [tag, raw] of Object.entries(items as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const item = raw as Record<string, unknown>;
    if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) continue;
    if (typeof item.symbol !== 'string' || item.symbol.length === 0) continue;
    const validated: LayoutItem = {
      x: item.x,
      y: item.y,
      rotation: isFiniteNumber(item.rotation) ? item.rotation : 0,
      symbol: item.symbol,
    };
    // Clamp here too: a hand-edited scale must not bypass the UI's range.
    if (isFiniteNumber(item.scale)) validated.scale = clampScale(item.scale);
    validatedItems[tag] = validated;
  }

  if (Object.keys(validatedItems).length === 0) return null;

  const validatedEdges: StoredEdge[] = Array.isArray(edges)
    ? (edges as unknown[]).flatMap((edge): StoredEdge[] => {
        if (!edge || typeof edge !== 'object') return [];
        const raw = edge as Record<string, unknown>;
        if (typeof raw.id !== 'string' || typeof raw.from !== 'string' || typeof raw.to !== 'string') return [];
        const kind = EDGE_KINDS.includes(raw.kind as StoredEdgeKind) ? (raw.kind as StoredEdgeKind) : undefined;
        const valveTag = typeof raw.valveTag === 'string' && raw.valveTag.length > 0 ? raw.valveTag : undefined;
        return [{ id: raw.id, from: raw.from, to: raw.to, ...(kind ? { kind } : {}), ...(valveTag ? { valveTag } : {}) }];
      })
    : [];

  return { items: validatedItems, edges: validatedEdges };
}

/**
 * Merge a persisted layout with the current template.
 *
 * Identity is the plant's: for a tag the template defines, the symbol always
 * comes from the template, so a layout saved before a symbol change cannot keep
 * drawing the old glyph. Position, rotation and scale are the operator's and
 * are kept from the stored layout. Tags that only exist in the stored layout
 * (added from the palette) keep their stored symbol.
 */
export function reconcileLayout(
  stored: Record<string, LayoutItem> | undefined,
  templateItems: Record<string, LayoutItem>
): Record<string, LayoutItem> {
  const result: Record<string, LayoutItem> = {};
  for (const [tag, templateItem] of Object.entries(templateItems)) {
    const saved = stored?.[tag];
    // `...saved` last so the operator's x/y/rotation/scale win; the explicit
    // `symbol` after it is what makes the template the identity source.
    result[tag] = saved ? { ...templateItem, ...saved, symbol: templateItem.symbol } : { ...templateItem };
  }
  for (const [tag, item] of Object.entries(stored ?? {})) {
    if (!(tag in templateItems)) result[tag] = item;
  }
  return result;
}

export function loadLayout(template: PlantTemplate): StoredLayout | null {
  try {
    const raw = localStorage.getItem(layoutKey(template));
    return raw ? validateStoredLayout(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveLayout(template: PlantTemplate, items: Record<string, LayoutItem>, edges: StoredEdge[]): void {
  try {
    localStorage.setItem(layoutKey(template), JSON.stringify({ items, edges }));
  } catch {
    // ignore
  }
}
