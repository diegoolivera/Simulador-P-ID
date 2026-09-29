import { PlantGraph } from '../engine/graph';
import type { PlantEdge, PlantNode } from '../types/plant';

const baseNode = (id: string, tag: string, kind: PlantNode['kind'], pressure = 0): PlantNode => ({
  id,
  tag,
  kind,
  pressure,
  liquidLevel: 0,
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

export const phase1Nodes: PlantNode[] = [
  baseNode('WELL-1', 'WELL-1', 'source', 95),
  baseNode('WELL-2', 'WELL-2', 'source', 95),
  baseNode('WELL-3', 'WELL-3', 'source', 95),
  baseNode('MANIFOLD', 'MANIFOLD', 'junction', 94),
  baseNode('SB-009', 'SB-009', 'vessel', 94),      // Desarenador
  baseNode('SB-001', 'SB-001', 'vessel', 93.5),    // Slug catcher
  { ...baseNode('V-6505', 'V-6505', 'vessel', 89), liquidLevel: 50 }, // Separador principal (LIC-6505 SP)
  { ...baseNode('SB-004', 'SB-004', 'vessel', 85), liquidLevel: 50 }, // Scrubber (LIC-004 SP)
  // Intermediate node between the two block valves wired in SERIES on the
  // SB-004 outlet (SDV-OUT-004 -> SB-004-OUT -> SDV-031A). A short line segment
  // between the valves; its pressure settles where the two valve flows meet.
  baseNode('SB-004-OUT', 'SB-004-OUT', 'junction', 72),
  // Mirror of SB-004-OUT on the INLET: PV-6505 and the scrubber's inlet block
  // valve V-IN-004 are in SERIES (V-6505 -> PV-6505 -> SB-004-IN -> V-IN-004 ->
  // SB-004). The junction is upstream of V-IN-004 on purpose: liquid is carried
  // at a conserved ratio through a junction, while a V-IN-* valve leaving a
  // VESSEL is treated as a level-driven liquid drain (see physics LIQ_LINE), so
  // this ordering keeps the gas block valve from doubling as a phantom drain.
  baseNode('SB-004-IN', 'SB-004-IN', 'junction', 80),
  // Motocompresor adds 40 kg/cm2 of head downstream of the suction scrubber.
  { ...baseNode('KG-31', 'KG-31', 'vessel', 49), boost: 40 },
  { ...baseNode('TC-11', 'TC-11', 'vessel', 80), condensateK: 1e-5 }, // Contactora TEG 1: ~12.5 m3/d condensate at 1.25 MMsm3/d
  { ...baseNode('TC-12', 'TC-12', 'vessel', 80), condensateK: 1e-5 }, // Contactora TEG 2
  baseNode('SALES-GAS', 'SALES-GAS', 'sink', 80),     // Gas de venta
  baseNode('COMPRESSION', 'COMPRESSION', 'sink', 80),
  baseNode('FLARE-HEADER', 'FLARE-HEADER', 'sink', 5),
  baseNode('TK-001', 'TK-001', 'vessel', 3.5),      // Líquidos de SB-001
  baseNode('TK-004', 'TK-004', 'vessel', 2.5),      // Líquidos de V-6505/SB-004
  { ...baseNode('ST-002', 'ST-002', 'vessel', 2.5), liquidLevel: 50 },  // Separador líquidos 1 (LIC-002 SP)
  { ...baseNode('ST-003', 'ST-003', 'vessel', 2.5), liquidLevel: 50 },  // Separador líquidos 2 (LIC-003 SP)
  { ...baseNode('TKAG-41', 'TKAG-41', 'vessel', 1.5), liquidLevel: 40, drainK: 6 }, // Tanque 1: storage drain keeps eq level 15-70%
  { ...baseNode('TKAG-42', 'TKAG-42', 'vessel', 1.5), liquidLevel: 40, drainK: 6 }, // Tanque 2
  baseNode('DISPATCH', 'DISPATCH', 'sink', 0),      // Despacho
  baseNode('DRAIN-PIT', 'DRAIN-PIT', 'sink', 0),
];

const valved = (id: string, from: string, to: string, valveTag: string, conductance = 1): PlantEdge => ({
  id,
  from,
  to,
  kind: 'valved',
  conductance,
  valveTag,
});

const control = (id: string, from: string, to: string, valveTag: string, conductance = 1): PlantEdge => ({
  id,
  from,
  to,
  kind: 'control',
  conductance,
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
  valved('sb009-sb001', 'SB-009', 'SB-001', 'V-OUT-009'),
  valved('sb009-sb001-in001', 'SB-009', 'SB-001', 'V-IN-001'),
  valved('dr009-drain', 'SB-009', 'DRAIN-PIT', 'DR-009'),
  // SB-001 -> V-6505 is a SINGLE run through V-OUT-001. It used to carry a
  // second parallel edge through V-IN-004, but V-IN-004 is SB-004's INLET block
  // valve (see LotoWizard and the legacy prototype), not a second SB-001 outlet.
  // Parallel edges sum conductance: with both R = 1 the pair behaved as one
  // R = 0.5 edge (1/Req = 1/R1 + 1/R2 = 1/1 + 1/1 = 2 -> Req = 0.5). Keeping the
  // surviving edge at R = 0.5 preserves this run's design flow by construction.
  valved('sb001-v6505', 'SB-001', 'V-6505', 'V-OUT-001', 0.5),
  valved('byp001', 'SB-009', 'V-6505', 'BYP-001'),
  // SB-004 inlet: PV-6505 and the inlet block valve V-IN-004 are wired in SERIES
  // with an intermediate junction, mirroring the outlet chain. PV-6505 keeps its
  // design R = 0.6 (so it sits near c = 0.5 holding SP 89; with R = 1.6 the line
  // alone needed dp = 4.2 at full flow and the valve pegged at 100%, leaving SP
  // unreachable). V-IN-004 is a full-bore on/off block valve, so it gets the
  // same small R = 0.35 as SDV-OUT-004 and barely moves the design point.
  control('pv6505-sb004in', 'V-6505', 'SB-004-IN', 'PV-6505', 0.6),
  valved('sb004in-sb004', 'SB-004-IN', 'SB-004', 'V-IN-004', 0.35),
  control('bdv6505-flare', 'V-6505', 'FLARE-HEADER', 'BDV-6505'),
  valved('psv6505-flare', 'V-6505', 'FLARE-HEADER', 'PSV-6505AD/BD'),
  control('lv6505-tk001', 'V-6505', 'TK-001', 'LV-6505'),
  valved('sdv001b-drain', 'TK-001', 'DRAIN-PIT', 'SDV-001B'),
  // SB-004 outlet is a double block in SERIES, not two parallel paths: closing
  // either SDV-OUT-004 or SDV-031A isolates the scrubber. Resistance divides the
  // flow (Q = c*K_Q*dp / (R*sqrt(dp+0.2))), so the segments do not simply add.
  // The outlet used to be a single edge with R = 3.7; SDV-031A keeps that value
  // and SDV-OUT-004 (a full-bore on/off block valve) adds a small R = 0.35.
  // Verified against the exam: with both open KG-31 settles at ~49.9 kg/cm2
  // (the single-edge design settled at ~50.4), inside the required 45-55 band.
  valved('sb004-sb004out', 'SB-004', 'SB-004-OUT', 'SDV-OUT-004', 0.35),
  valved('sb004out-kg31', 'SB-004-OUT', 'KG-31', 'SDV-031A', 3.7),
  valved('kg31-compression', 'KG-31', 'COMPRESSION', 'SDV-032A'),
  control('bdv031-flare', 'KG-31', 'FLARE-HEADER', 'BDV-031B'),
  control('kg31-tc11', 'KG-31', 'TC-11', 'FV-185'),
  control('tc11-sales', 'TC-11', 'SALES-GAS', 'SDV-11OUT'),
  control('kg31-tc12', 'KG-31', 'TC-12', 'FV-186'),
  control('tc12-sales', 'TC-12', 'SALES-GAS', 'SDV-12OUT'),
  valved('byp004', 'SB-001', 'COMPRESSION', 'BYP-004'),
  control('vt004-flare', 'SB-004', 'FLARE-HEADER', 'VT-004'),
  control('lv004-tk004', 'SB-004', 'TK-004', 'LV-004'),
  valved('xv004d-drain', 'TK-004', 'DRAIN-PIT', 'XV-004D'),
  control('tc11-st002', 'TC-11', 'ST-002', 'LV-11LIQ'),
  control('tc12-st003', 'TC-12', 'ST-003', 'LV-12LIQ'),
  control('kg31-st002', 'KG-31', 'ST-002', 'LV-KG31LIQ'),
  control('st002-tkag41', 'ST-002', 'TKAG-41', 'LV-002'),
  control('st003-tkag42', 'ST-003', 'TKAG-42', 'LV-003'),
  valved('ba051-dispatch', 'TKAG-41', 'DISPATCH', 'BA-051'),
  valved('ba052-dispatch', 'TKAG-42', 'DISPATCH', 'BA-052'),
];

export function createPhase1Graph(): PlantGraph {
  const graph = new PlantGraph();
  // Fresh clones per graph: physics mutates nodes (pressure/level), so sharing
  // module-level objects would leak state across init()/tests.
  for (const node of structuredClone(phase1Nodes)) graph.addNode(node);
  for (const edge of phase1Edges) graph.addEdge(edge);
  return graph;
}
