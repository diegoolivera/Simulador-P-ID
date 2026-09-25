import { describe, expect, it } from 'vitest';
import { createPhase1Graph, phase1Edges, phase1Nodes } from './phase1';
import layout from './layout.json';

const items = layout.items as Record<string, unknown>;

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
});
