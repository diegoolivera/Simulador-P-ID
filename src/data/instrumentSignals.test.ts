import { describe, expect, it } from 'vitest';
import { INSTRUMENT_SIGNALS } from './instrumentSignals';
import { TEMPLATES } from './templates';
import { createPhase1Graph, phase1Edges } from './phase1';
import {
  createCoolingWaterGraph,
  createElectricalGraph,
  createFuelGasGraph,
  createInstrumentAirGraph,
} from './phase2';
import { createPiaGraph, createTegGraph } from './phase3';
import { useSimulationStore } from '../stores/simulationStore';

/** Every node tag that actually exists in one of the plant graphs. */
const realNodeTags = (): Set<string> => {
  const graphs = [
    createPhase1Graph(),
    createInstrumentAirGraph(),
    createCoolingWaterGraph(),
    createFuelGasGraph(),
    createElectricalGraph(),
    createPiaGraph(),
    createTegGraph(),
  ];
  const tags = new Set<string>();
  for (const graph of graphs) {
    for (const id of graph.nodes.keys()) tags.add(id);
  }
  return tags;
};

describe('INSTRUMENT_SIGNALS', () => {
  it('resolves every target to a real node tag in one of the plant graphs', () => {
    const nodeTags = realNodeTags();
    for (const { instrumentTag, targetTag } of INSTRUMENT_SIGNALS) {
      expect(nodeTags.has(targetTag), `${instrumentTag} -> ${targetTag} is not a real node`).toBe(true);
    }
  });

  it('keeps instrument tags out of the process nodes: they are annotations', () => {
    const nodeTags = realNodeTags();
    for (const { instrumentTag } of INSTRUMENT_SIGNALS) {
      expect(nodeTags.has(instrumentTag), `${instrumentTag} must not be a process node`).toBe(false);
    }
  });

  it('lists each instrument at most once', () => {
    const seen = new Set<string>();
    for (const { instrumentTag } of INSTRUMENT_SIGNALS) {
      expect(seen.has(instrumentTag), `${instrumentTag} appears twice`).toBe(false);
      seen.add(instrumentTag);
    }
  });

  it('covers every instrument bubble drawn in the templates', () => {
    const mapped = new Set(INSTRUMENT_SIGNALS.map((s) => s.instrumentTag));
    const drawn = new Set<string>();
    for (const template of Object.values(TEMPLATES)) {
      for (const [tag, item] of Object.entries(template.items)) {
        if (item.symbol === 'transmitter' || item.symbol === 'controller') drawn.add(tag);
      }
    }
    for (const tag of drawn) {
      expect(mapped.has(tag), `${tag} is drawn but not mapped`).toBe(true);
    }
  });

  it('covers the instruments the operator reported as floating', () => {
    const mapped = new Set(INSTRUMENT_SIGNALS.map((s) => s.instrumentTag));
    for (const tag of ['PT-6505', 'LIC-004', 'PIC-6505', 'LT-004', 'ΔP-009']) {
      expect(mapped.has(tag), `${tag} must be mapped`).toBe(true);
    }
  });
});

describe('instrument signals are annotations, not process edges', () => {
  it('does not add edges to any plant graph', () => {
    useSimulationStore.getState().init();
    const state = useSimulationStore.getState();
    const graphs = [state.graph, state.iaGraph, state.cwGraph, state.fgGraph, state.elGraph, state.piaGraph, state.tegGraph];

    for (const graph of graphs) {
      for (const { instrumentTag } of INSTRUMENT_SIGNALS) {
        const leaked = graph.edges.some(
          (e) => e.from === instrumentTag || e.to === instrumentTag || e.id.includes(instrumentTag)
        );
        expect(leaked, `${instrumentTag} leaked into graph.edges`).toBe(false);
      }
    }
  });

  it('leaves the phase1 edge list exactly as the process model defines it', () => {
    useSimulationStore.getState().init();
    expect(useSimulationStore.getState().graph.edges).toHaveLength(phase1Edges.length);
  });

  it('leaves the phase1 process graph acyclic', () => {
    useSimulationStore.getState().init();
    const graph = useSimulationStore.getState().graph;
    expect(() => graph.getTopologicalOrder()).not.toThrow();
    expect(graph.getTopologicalOrder()).toHaveLength(graph.nodes.size);
  });
});
