import { PlantGraph } from '../engine/graph';
import type { PlantEdge, PlantNode } from '../types/plant';

const baseNode = (id: string, tag: string, kind: PlantNode['kind']): PlantNode => ({
  id,
  tag,
  kind,
  pressure: 0,
  liquidLevel: 0,
  sandLevel: 0,
  volume: 10,
  separationEfficiency: 0,
  demisterDP: 0,
  fouling: 0,
  inletIds: [],
  outletIds: [],
});

export const phase1Nodes: PlantNode[] = [
  baseNode('WELL-1', 'WELL-1', 'source'),
  baseNode('WELL-2', 'WELL-2', 'source'),
  baseNode('WELL-3', 'WELL-3', 'source'),
  baseNode('MANIFOLD', 'MANIFOLD', 'junction'),
  baseNode('SB-009', 'SB-009', 'vessel'),
  baseNode('SB-001', 'SB-001', 'vessel'),
  baseNode('SB-004', 'SB-004', 'vessel'),
  baseNode('COMPRESSION', 'COMPRESSION', 'sink'),
  baseNode('FLARE-HEADER', 'FLARE-HEADER', 'sink'),
  baseNode('TK-001', 'TK-001', 'vessel'),
  baseNode('TK-004', 'TK-004', 'vessel'),
  baseNode('DRAIN-PIT', 'DRAIN-PIT', 'sink'),
];

const valved = (id: string, from: string, to: string, valveTag: string): PlantEdge => ({
  id,
  from,
  to,
  kind: 'valved',
  conductance: 1,
  valveTag,
});

const control = (id: string, from: string, to: string, valveTag: string): PlantEdge => ({
  id,
  from,
  to,
  kind: 'control',
  conductance: 1,
  valveTag,
});

const pipe = (id: string, from: string, to: string): PlantEdge => ({
  id,
  from,
  to,
  kind: 'pipe',
  conductance: 1,
});

export const phase1Edges: PlantEdge[] = [
  pipe('well1-manifold', 'WELL-1', 'MANIFOLD'),
  pipe('well2-manifold', 'WELL-2', 'MANIFOLD'),
  pipe('well3-manifold', 'WELL-3', 'MANIFOLD'),
  valved('manifold-sb009', 'MANIFOLD', 'SB-009', 'V-IN-009'),
  valved('byp009', 'MANIFOLD', 'SB-001', 'BYP-009'),
  valved('sb009-sb001-out009', 'SB-009', 'SB-001', 'V-OUT-009'),
  valved('sb009-sb001-in001', 'SB-009', 'SB-001', 'V-IN-001'),
  valved('dr009-drain', 'SB-009', 'DRAIN-PIT', 'DR-009'),
  valved('sb001-sb004-out001', 'SB-001', 'SB-004', 'V-OUT-001'),
  valved('sb001-sb004-in004', 'SB-001', 'SB-004', 'V-IN-004'),
  valved('byp001', 'SB-009', 'SB-004', 'BYP-001'),
  control('pv101-sb004', 'SB-001', 'SB-004', 'PV-101'),
  control('bdv001a-flare', 'SB-001', 'FLARE-HEADER', 'BDV-001A'),
  valved('psv001bd-flare', 'SB-001', 'FLARE-HEADER', 'PSV-001AD/BD'),
  control('lv001ba-tk001', 'SB-001', 'TK-001', 'LV-001BA'),
  valved('sdv001b-drain', 'TK-001', 'DRAIN-PIT', 'SDV-001B'),
  valved('sb004-compression', 'SB-004', 'COMPRESSION', 'SDV-OUT-004'),
  valved('byp004', 'SB-001', 'COMPRESSION', 'BYP-004'),
  control('vt004-flare', 'SB-004', 'FLARE-HEADER', 'VT-004'),
  control('lv004-tk004', 'SB-004', 'TK-004', 'LV-004'),
  valved('xv004d-drain', 'TK-004', 'DRAIN-PIT', 'XV-004D'),
];

export function createPhase1Graph(): PlantGraph {
  const graph = new PlantGraph();
  for (const node of phase1Nodes) graph.addNode(node);
  for (const edge of phase1Edges) graph.addEdge(edge);
  return graph;
}
