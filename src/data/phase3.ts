import { PlantGraph } from '../engine/graph';
import type { PlantEdge, PlantNode } from '../types/plant';

const node = (id: string, tag: string, kind: PlantNode['kind'], pressure = 0, liquidLevel = 0): PlantNode => ({
  id,
  tag,
  kind,
  pressure,
  liquidLevel,
  sandLevel: 0,
  volume: 10,
  separationEfficiency: 0,
  demisterDP: 0,
  fouling: 0,
  gasFlow: 0,
  liquidFlow: 0,
  inletIds: [],
  outletIds: [],
});

const pipe = (id: string, from: string, to: string): PlantEdge => ({
  id,
  from,
  to,
  kind: 'pipe',
  conductance: 1,
});

export const piaNodes: PlantNode[] = [
  node('PIA-SUPPLY', 'PIA-SUPPLY', 'source', 2.0),
  node('PIA-PUMP-A', 'PIA-PUMP-A', 'source', 37.0),
  node('PIA-PUMP-B', 'PIA-PUMP-B', 'source', 37.0),
  node('PIA-FILTER', 'PIA-FILTER', 'vessel', 35.0),
  node('PIA-HEADER', 'PIA-HEADER', 'header', 35.0),
  node('PIA-INJ-WELL', 'PIA-INJ-WELL', 'sink', 32.0),
];

export const piaEdges: PlantEdge[] = [
  pipe('pia-supply-pumpA', 'PIA-SUPPLY', 'PIA-PUMP-A'),
  pipe('pia-supply-pumpB', 'PIA-SUPPLY', 'PIA-PUMP-B'),
  pipe('pia-pumpA-filter', 'PIA-PUMP-A', 'PIA-FILTER'),
  pipe('pia-pumpB-filter', 'PIA-PUMP-B', 'PIA-FILTER'),
  pipe('pia-filter-header', 'PIA-FILTER', 'PIA-HEADER'),
  pipe('pia-header-inj', 'PIA-HEADER', 'PIA-INJ-WELL'),
];

export function createPiaGraph(): PlantGraph {
  const graph = new PlantGraph();
  for (const n of structuredClone(piaNodes)) graph.addNode(n);
  for (const e of piaEdges) graph.addEdge(e);
  return graph;
}

export const tegNodes: PlantNode[] = [
  node('TEG-INLET', 'TEG-INLET', 'source', 40.0),
  node('TEG-CONTACTOR', 'TEG-CONTACTOR', 'vessel', 38.0, 0.6),
  node('TEG-DRY-GAS', 'TEG-DRY-GAS', 'sink', -20.0),
  node('TEG-RICH-PUMP', 'TEG-RICH-PUMP', 'source', 1.5),
  node('TEG-REGEN', 'TEG-REGEN', 'vessel', 200.0),
  node('TEG-LEAN-PUMP', 'TEG-LEAN-PUMP', 'source', 2.0),
  node('TEG-LEAN-TANK', 'TEG-LEAN-TANK', 'vessel', 1.8),
];

export const tegEdges: PlantEdge[] = [
  pipe('teg-inlet-contactor', 'TEG-INLET', 'TEG-CONTACTOR'),
  pipe('teg-contactor-dry', 'TEG-CONTACTOR', 'TEG-DRY-GAS'),
  pipe('teg-contactor-rich', 'TEG-CONTACTOR', 'TEG-RICH-PUMP'),
  pipe('teg-rich-regen', 'TEG-RICH-PUMP', 'TEG-REGEN'),
  pipe('teg-regen-lean', 'TEG-REGEN', 'TEG-LEAN-PUMP'),
  pipe('teg-lean-tank', 'TEG-LEAN-PUMP', 'TEG-LEAN-TANK'),
  pipe('teg-tank-contactor', 'TEG-LEAN-TANK', 'TEG-CONTACTOR'),
];

export function createTegGraph(): PlantGraph {
  const graph = new PlantGraph();
  for (const n of structuredClone(tegNodes)) graph.addNode(n);
  for (const e of tegEdges) graph.addEdge(e);
  return graph;
}
