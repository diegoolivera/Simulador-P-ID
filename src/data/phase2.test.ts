import { describe, expect, it } from 'vitest';
import {
  coolingWaterNodes,
  createCoolingWaterGraph,
  createFuelGasGraph,
  createInstrumentAirGraph,
  fuelGasNodes,
  instrumentAirEdges,
  instrumentAirNodes,
} from './phase2';
import layout from './layout.json';

const items = layout.items as Record<string, unknown>;

describe('Phase 2 instrument air data', () => {
  it('graph is acyclic and contains all nodes', () => {
    const graph = createInstrumentAirGraph();
    expect(graph.getTopologicalOrder().length).toBe(instrumentAirNodes.length);
  });

  it('layout covers every instrument air node tag', () => {
    for (const node of instrumentAirNodes) {
      expect(items[node.tag], `missing layout for ${node.tag}`).toBeDefined();
    }
  });

  it('layout covers every instrument air edge tag', () => {
    for (const edge of instrumentAirEdges) {
      if (edge.valveTag) {
        expect(items[edge.valveTag], `missing layout for ${edge.valveTag}`).toBeDefined();
      }
    }
  });
});

describe('Phase 2 cooling water data', () => {
  it('graph is acyclic and contains all nodes', () => {
    const graph = createCoolingWaterGraph();
    expect(graph.getTopologicalOrder().length).toBe(coolingWaterNodes.length);
  });

  it('layout covers every cooling water node tag', () => {
    for (const node of coolingWaterNodes) {
      expect(items[node.tag], `missing layout for ${node.tag}`).toBeDefined();
    }
  });
});

describe('Phase 2 fuel gas data', () => {
  it('graph is acyclic and contains all nodes', () => {
    const graph = createFuelGasGraph();
    expect(graph.getTopologicalOrder().length).toBe(fuelGasNodes.length);
  });

  it('layout covers every fuel gas node tag', () => {
    for (const node of fuelGasNodes) {
      expect(items[node.tag], `missing layout for ${node.tag}`).toBeDefined();
    }
  });
});


