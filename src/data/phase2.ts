import { PlantGraph } from '../engine/graph';
import type { PlantEdge, PlantNode } from '../types/plant';

const INITIAL_HEADER_PRESSURE = 7.0;

const iaNode = (id: string, tag: string, kind: PlantNode['kind'], pressure = 0): PlantNode => ({
  id,
  tag,
  kind,
  pressure,
  liquidLevel: 0,
  sandLevel: 0,
  volume: 0,
  separationEfficiency: 0,
  demisterDP: 0,
  fouling: 0,
  inletIds: [],
  outletIds: [],
});

export const instrumentAirNodes: PlantNode[] = [
  iaNode('IA-COMP-A', 'IA-COMP-A', 'source', INITIAL_HEADER_PRESSURE),
  iaNode('IA-COMP-B', 'IA-COMP-B', 'source', INITIAL_HEADER_PRESSURE),
  iaNode('IA-RECV', 'IA-RECV', 'vessel', INITIAL_HEADER_PRESSURE),
  iaNode('IA-HEADER', 'IA-HEADER', 'header', INITIAL_HEADER_PRESSURE),
];

const pipe = (id: string, from: string, to: string): PlantEdge => ({
  id,
  from,
  to,
  kind: 'pipe',
  conductance: 1,
});

export const instrumentAirEdges: PlantEdge[] = [
  pipe('compA-recv', 'IA-COMP-A', 'IA-RECV'),
  pipe('compB-recv', 'IA-COMP-B', 'IA-RECV'),
  pipe('recv-header', 'IA-RECV', 'IA-HEADER'),
];

export function createInstrumentAirGraph(): PlantGraph {
  const graph = new PlantGraph();
  for (const node of instrumentAirNodes) graph.addNode(node);
  for (const edge of instrumentAirEdges) graph.addEdge(edge);
  return graph;
}
