import { describe, expect, it } from 'vitest';
import { createInstrumentAirGraph, instrumentAirEdges, instrumentAirNodes } from './phase2';
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
