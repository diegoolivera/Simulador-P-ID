import { describe, expect, it } from 'vitest';
import { createPhase1Graph, phase1Edges, phase1Nodes } from './phase1';
import { useSimulationStore } from '../stores/simulationStore';
import { useScenarioStore } from '../stores/scenarioStore';
import { useEvalStore } from '../stores/evalStore';
import layout from './layout.json';

const items = layout.items as Record<string, unknown>;

const bootSim = (seconds = 30) => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().reset();
  useEvalStore.getState().startScenario();
  useScenarioStore.getState().loadScenario('normal-operation');
  useSimulationStore.getState().setRunning(true);
  for (let i = 0; i < seconds; i += 1) useSimulationStore.getState().tick(1);
};

describe('Phase 1 plant data', () => {
  it('graph is acyclic and contains all nodes', () => {
    const graph = createPhase1Graph();
    expect(graph.getTopologicalOrder().length).toBe(phase1Nodes.length);
  });

  it('layout covers every plant node tag', () => {
    for (const node of phase1Nodes) {
      expect(items[node.tag], `missing layout for ${node.tag}`).toBeDefined();
    }
  });

  it('layout covers every valve tag', () => {
    for (const edge of phase1Edges) {
      if (edge.valveTag) {
        expect(items[edge.valveTag], `missing layout for ${edge.valveTag}`).toBeDefined();
      }
    }
  });

  it('wires SDV-OUT-004 and SDV-031A in series on the SB-004 outlet', () => {
    const outlet = phase1Edges.find((e) => e.valveTag === 'SDV-OUT-004');
    expect(outlet).toBeDefined();
    expect(outlet!.from).toBe('SB-004');

    const intermediate = outlet!.to;
    expect(intermediate).not.toBe('KG-31');
    expect(phase1Nodes.some((n) => n.tag === intermediate)).toBe(true);

    const suction = phase1Edges.find((e) => e.valveTag === 'SDV-031A');
    expect(suction).toBeDefined();
    expect(suction!.from).toBe(intermediate);
    expect(suction!.to).toBe('KG-31');

    // No parallel SB-004 -> KG-31 edge may bypass either block valve.
    expect(phase1Edges.filter((e) => e.from === 'SB-004' && e.to === 'KG-31')).toHaveLength(0);
  });

  it('wires V-IN-004 on the SB-004 inlet run, in series with PV-6505', () => {
    const inlet = phase1Edges.find((e) => e.valveTag === 'V-IN-004');
    expect(inlet, 'V-IN-004 must be wired to an edge').toBeDefined();
    // It is the scrubber's inlet block valve, so it lands on SB-004 — not on
    // the SB-001 -> V-6505 run it used to sit on.
    expect(inlet!.to).toBe('SB-004');
    expect(inlet!.from).not.toBe('SB-001');
    expect(phase1Edges.filter((e) => e.valveTag === 'V-IN-004' && e.to === 'V-6505')).toHaveLength(0);

    // PV-6505 feeds the intermediate junction that V-IN-004 drains, and no
    // parallel V-6505 -> SB-004 edge bypasses the two series valves.
    const pv = phase1Edges.find((e) => e.valveTag === 'PV-6505');
    expect(pv).toBeDefined();
    expect(pv!.to).toBe(inlet!.from);
    expect(phase1Edges.filter((e) => e.from === 'V-6505' && e.to === 'SB-004')).toHaveLength(0);
  });

  it('keeps SB-001 -> V-6505 a single run so V-OUT-001 alone blocks it', () => {
    const runs = phase1Edges.filter((e) => e.from === 'SB-001' && e.to === 'V-6505');
    expect(runs).toHaveLength(1);
    expect(runs[0].valveTag).toBe('V-OUT-001');

    bootSim();
    const before = useSimulationStore.getState().graph.nodes.get('V-6505')!.gasFlow;
    expect(before, 'V-6505 must be fed before the outlet is blocked').toBeGreaterThan(0);
    expect(useSimulationStore.getState().commandValve('V-OUT-001', 0, 'manual', 'block SB-001 outlet')).toBe(true);
    for (let i = 0; i < 5; i += 1) useSimulationStore.getState().tick(1);
    expect(useSimulationStore.getState().graph.nodes.get('V-6505')!.gasFlow).toBe(0);
  });

  it('closing V-IN-004 alone isolates the SB-004 inlet', () => {
    bootSim();
    const before = useSimulationStore.getState().graph.nodes.get('SB-004')!.gasFlow;
    expect(before, 'SB-004 must be fed before the inlet is blocked').toBeGreaterThan(0);
    expect(useSimulationStore.getState().commandValve('V-IN-004', 0, 'manual', 'isolate SB-004 inlet')).toBe(true);
    for (let i = 0; i < 5; i += 1) useSimulationStore.getState().tick(1);
    expect(useSimulationStore.getState().graph.nodes.get('SB-004')!.gasFlow).toBe(0);
    // Upstream is untouched: the separator keeps feeding the scrubber line.
    expect(useSimulationStore.getState().graph.nodes.get('V-6505')!.gasFlow).toBeGreaterThan(0);
  });

  it('stays acyclic with the inlet junction on the flow path', () => {
    const order = createPhase1Graph().getTopologicalOrder();
    expect(order).toHaveLength(phase1Nodes.length);
    expect(order.indexOf('V-6505')).toBeLessThan(order.indexOf('SB-004-IN'));
    expect(order.indexOf('SB-004-IN')).toBeLessThan(order.indexOf('SB-004'));
  });

  it('registers both SB-004 outlet block valves as real valve entries', () => {
    useSimulationStore.getState().init();
    const valves = useSimulationStore.getState().valves;
    expect(valves.has('SDV-OUT-004')).toBe(true);
    expect(valves.has('SDV-031A')).toBe(true);
  });

  it('closing either block valve stops flow into KG-31', () => {
    // Downstream valve: cutting the inlet edge stops the feed at once.
    bootSim();
    expect(useSimulationStore.getState().commandValve('SDV-031A', 0, 'manual', 'isolation check')).toBe(true);
    for (let i = 0; i < 5; i += 1) useSimulationStore.getState().tick(1);
    expect(useSimulationStore.getState().graph.nodes.get('KG-31')!.gasFlow).toBe(0);

    // Upstream valve: SB-004 stops feeding the intermediate node immediately...
    bootSim();
    const before = useSimulationStore.getState().graph.nodes.get('KG-31')!.gasFlow;
    expect(before, 'no gas reached KG-31 before closing SDV-OUT-004').toBeGreaterThan(0);
    expect(useSimulationStore.getState().commandValve('SDV-OUT-004', 0, 'manual', 'isolation check')).toBe(true);
    for (let i = 0; i < 5; i += 1) useSimulationStore.getState().tick(1);
    expect(useSimulationStore.getState().graph.nodes.get('SB-004-OUT')!.gasFlow).toBe(0);

    // ...and KG-31 drains the trapped cavity between the two blocks down to a
    // standstill. The orifice law is regularised, so the decay is asymptotic:
    // assert the flow is effectively dead, not bit-exact zero.
    for (let i = 0; i < 400; i += 1) useSimulationStore.getState().tick(1);
    expect(useSimulationStore.getState().graph.nodes.get('KG-31')!.gasFlow).toBeLessThan(1);
  });
});
