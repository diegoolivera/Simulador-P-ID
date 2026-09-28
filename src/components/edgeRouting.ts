import type { PlantEdge } from '../types/plant';

export interface RoutePoint {
  x: number;
  y: number;
}

export interface EdgeSegment {
  from: RoutePoint;
  to: RoutePoint;
}

/**
 * Split one graph edge into the pipe segments the P&ID must draw.
 *
 * A valve is NOT an edge endpoint: `data/phase1.ts` and `data/phase2.ts` run an
 * edge between two equipment nodes and merely NAME their valve through
 * `valveTag` (e.g. `SB-004 -> SB-004-OUT`, valve `SDV-OUT-004`). Drawing the
 * edge as a single straight line therefore leaves the valve glyph floating
 * beside its pipe instead of sitting on it. When the named valve exists in the
 * current template we route the pipe THROUGH it and return two segments
 * (`from -> valve`, `valve -> to`), which is what a real P&ID shows.
 *
 * Falls back to one straight segment when:
 *   - the edge carries no `valveTag`;
 *   - the named valve item is absent from this template (never drop a pipe);
 *   - the valve tag is already one of the edge endpoints (routing would draw a
 *     zero-length segment; the straight line already passes through the glyph).
 *
 * Returns `null` when either equipment endpoint is absent, mirroring the old
 * `items[e.from] && items[e.to]` render filter.
 */
export function edgeSegments(edge: PlantEdge, items: Record<string, RoutePoint>): EdgeSegment[] | null {
  const from = items[edge.from];
  const to = items[edge.to];
  if (!from || !to) return null;

  const valve = edge.valveTag ? items[edge.valveTag] : undefined;
  if (!valve || edge.valveTag === edge.from || edge.valveTag === edge.to) {
    return [{ from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } }];
  }

  return [
    { from: { x: from.x, y: from.y }, to: { x: valve.x, y: valve.y } },
    { from: { x: valve.x, y: valve.y }, to: { x: to.x, y: to.y } },
  ];
}
