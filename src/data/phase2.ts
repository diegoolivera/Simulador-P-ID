import { PlantGraph } from '../engine/graph';
import type { PlantEdge, PlantNode } from '../types/plant';

const INITIAL_IA_HEADER_PRESSURE = 7.0;
const INITIAL_CW_HEADER_PRESSURE = 4.0;
const INITIAL_FG_HEADER_PRESSURE = 3.0;
const NOMINAL_BUS_VOLTAGE = 1.0;


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
  iaNode('IA-COMP-A', 'IA-COMP-A', 'source', INITIAL_IA_HEADER_PRESSURE),
  iaNode('IA-COMP-B', 'IA-COMP-B', 'source', INITIAL_IA_HEADER_PRESSURE),
  iaNode('IA-RECV', 'IA-RECV', 'vessel', INITIAL_IA_HEADER_PRESSURE),
  iaNode('IA-HEADER', 'IA-HEADER', 'header', INITIAL_IA_HEADER_PRESSURE),
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

export const coolingWaterNodes: PlantNode[] = [
  iaNode('CW-PUMP-A', 'CW-PUMP-A', 'source', INITIAL_CW_HEADER_PRESSURE),
  iaNode('CW-PUMP-B', 'CW-PUMP-B', 'source', INITIAL_CW_HEADER_PRESSURE),
  iaNode('CW-HEADER', 'CW-HEADER', 'header', INITIAL_CW_HEADER_PRESSURE),
  iaNode('CW-RETURN', 'CW-RETURN', 'sink', INITIAL_CW_HEADER_PRESSURE),
];

export const coolingWaterEdges: PlantEdge[] = [
  pipe('pumpA-header', 'CW-PUMP-A', 'CW-HEADER'),
  pipe('pumpB-header', 'CW-PUMP-B', 'CW-HEADER'),
  pipe('header-return', 'CW-HEADER', 'CW-RETURN'),
];

export function createCoolingWaterGraph(): PlantGraph {
  const graph = new PlantGraph();
  for (const node of coolingWaterNodes) graph.addNode(node);
  for (const edge of coolingWaterEdges) graph.addEdge(edge);
  return graph;
}

export const fuelGasNodes: PlantNode[] = [
  iaNode('FG-SUPPLY', 'FG-SUPPLY', 'source', 4.0),
  iaNode('FG-001', 'FG-001', 'vessel', 3.5),
  iaNode('FG-REG', 'FG-REG', 'junction', INITIAL_FG_HEADER_PRESSURE),
  iaNode('FG-HEADER', 'FG-HEADER', 'header', INITIAL_FG_HEADER_PRESSURE),
  iaNode('FG-PILOT', 'FG-PILOT', 'sink', 1.0),
  iaNode('FG-FLARE', 'FG-FLARE', 'sink', 0.5),
  iaNode('FG-HEATER', 'FG-HEATER', 'sink', 1.0),
];

export const fuelGasEdges: PlantEdge[] = [
  pipe('fg-supply-scrubber', 'FG-SUPPLY', 'FG-001'),
  pipe('fg-scrubber-reg', 'FG-001', 'FG-REG'),
  pipe('fg-reg-header', 'FG-REG', 'FG-HEADER'),
  pipe('fg-header-pilot', 'FG-HEADER', 'FG-PILOT'),
  pipe('fg-header-flare', 'FG-HEADER', 'FG-FLARE'),
  pipe('fg-header-heater', 'FG-HEADER', 'FG-HEATER'),
];

export function createFuelGasGraph(): PlantGraph {
  const graph = new PlantGraph();
  for (const node of fuelGasNodes) graph.addNode(node);
  for (const edge of fuelGasEdges) graph.addEdge(edge);
  return graph;
}

export const electricalNodes: PlantNode[] = [
  iaNode('GEN-001', 'GEN-001', 'source', 1.05),
  iaNode('BUS-MAIN', 'BUS-MAIN', 'header', NOMINAL_BUS_VOLTAGE),
  iaNode('MCC-001', 'MCC-001', 'junction', NOMINAL_BUS_VOLTAGE),
  iaNode('LOAD-PROC', 'LOAD-PROC', 'sink', NOMINAL_BUS_VOLTAGE),
  iaNode('LOAD-ESSENTIAL', 'LOAD-ESSENTIAL', 'sink', NOMINAL_BUS_VOLTAGE),
];

export const electricalEdges: PlantEdge[] = [
  pipe('gen-bus', 'GEN-001', 'BUS-MAIN'),
  pipe('bus-mcc', 'BUS-MAIN', 'MCC-001'),
  pipe('mcc-process', 'MCC-001', 'LOAD-PROC'),
  pipe('mcc-essential', 'MCC-001', 'LOAD-ESSENTIAL'),
];

export function createElectricalGraph(): PlantGraph {
  const graph = new PlantGraph();
  for (const node of electricalNodes) graph.addNode(node);
  for (const edge of electricalEdges) graph.addEdge(edge);
  return graph;
}
