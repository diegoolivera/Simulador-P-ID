import { describe, expect, it } from 'vitest';
import { SYSTEM_TIE_INS } from './systemTieIns';
import type { PlantSystem } from './templates';
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

const tagsOf = (graph: { nodes: Map<string, unknown> }): Set<string> => new Set(graph.nodes.keys());

const processTags = () => tagsOf(createPhase1Graph());

/** The graph each subsystem's nodes live in, so the `subsystem` label is checked. */
const SUBSYSTEM_GRAPH: Partial<Record<PlantSystem, Set<string>>> = {
  fuelGas: tagsOf(createFuelGasGraph()),
  instrumentAir: tagsOf(createInstrumentAirGraph()),
  coolingWater: tagsOf(createCoolingWaterGraph()),
  electrical: tagsOf(createElectricalGraph()),
  pia: tagsOf(createPiaGraph()),
  teg: tagsOf(createTegGraph()),
};

describe('SYSTEM_TIE_INS', () => {
  it('references tags that actually exist in the real graphs', () => {
    const nodeTags = realNodeTags();
    for (const { fromTag, toTag, subsystem } of SYSTEM_TIE_INS) {
      expect(nodeTags.has(fromTag), `${subsystem}: ${fromTag} is not a real node`).toBe(true);
      expect(nodeTags.has(toTag), `${subsystem}: ${toTag} is not a real node`).toBe(true);
    }
  });

  it('ties a utility-side node to a Phase 1 process node', () => {
    const process = processTags();
    for (const { fromTag, toTag, subsystem } of SYSTEM_TIE_INS) {
      expect(SUBSYSTEM_GRAPH[subsystem]?.has(fromTag), `${subsystem}: ${fromTag} is not a ${subsystem} node`).toBe(true);
      expect(process.has(toTag), `${subsystem}: ${toTag} is not a process node`).toBe(true);
      expect(process.has(fromTag), `${subsystem}: ${fromTag} must not be a process node`).toBe(false);
    }
  });

  it('lists each from -> to pair at most once', () => {
    const seen = new Set<string>();
    for (const { fromTag, toTag } of SYSTEM_TIE_INS) {
      const key = `${fromTag}->${toTag}`;
      expect(seen.has(key), `${key} appears twice`).toBe(false);
      seen.add(key);
    }
  });

  it('covers the subsystems whose tie-in point is established from evidence', () => {
    const mapped = new Set(SYSTEM_TIE_INS.map((t) => t.subsystem));
    for (const subsystem of ['fuelGas', 'instrumentAir', 'electrical', 'pia', 'teg'] as PlantSystem[]) {
      expect(mapped.has(subsystem), `${subsystem} has no tie-in entry`).toBe(true);
    }
  });
});

describe('tie-ins are annotations, not process edges', () => {
  it('does not add edges to the Phase 1 process graph', () => {
    useSimulationStore.getState().init();
    expect(useSimulationStore.getState().graph.edges).toHaveLength(phase1Edges.length);
  });

  it('leaves the Phase 1 process graph acyclic', () => {
    useSimulationStore.getState().init();
    const graph = useSimulationStore.getState().graph;
    expect(() => graph.getTopologicalOrder()).not.toThrow();
    expect(graph.getTopologicalOrder()).toHaveLength(graph.nodes.size);
  });
});
