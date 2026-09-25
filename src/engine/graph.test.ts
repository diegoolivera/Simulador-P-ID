import { describe, expect, it } from 'vitest';
import { PlantGraph } from './graph';
import type { PlantNode } from '../types/plant';

const makeNode = (id: string): PlantNode => ({
  id,
  tag: id,
  kind: 'vessel',
  pressure: 0,
  liquidLevel: 0,
  sandLevel: 0,
  volume: 10,
  separationEfficiency: 0,
  demisterDP: 0,
  fouling: 0,
  inletIds: [],
  outletIds: [],
});

describe('PlantGraph', () => {
  it('adds nodes and edges', () => {
    const graph = new PlantGraph();
    graph.addNode(makeNode('src'));
    graph.addNode(makeNode('sink'));
    graph.addEdge({ id: 'e1', from: 'src', to: 'sink', kind: 'pipe', conductance: 1 });
    expect(graph.nodes.size).toBe(2);
    expect(graph.edges.length).toBe(1);
  });

  it('returns a deterministic topological order', () => {
    const graph = new PlantGraph();
    graph.addNode(makeNode('a'));
    graph.addNode(makeNode('b'));
    graph.addNode(makeNode('c'));
    graph.addEdge({ id: 'ab', from: 'a', to: 'b', kind: 'pipe', conductance: 1 });
    graph.addEdge({ id: 'bc', from: 'b', to: 'c', kind: 'pipe', conductance: 1 });
    expect(graph.getTopologicalOrder()).toEqual(['a', 'b', 'c']);
  });

  it('throws on duplicate node', () => {
    const graph = new PlantGraph();
    graph.addNode(makeNode('x'));
    expect(() => graph.addNode(makeNode('x'))).toThrow('Node x already exists');
  });

  it('throws on cycle', () => {
    const graph = new PlantGraph();
    graph.addNode(makeNode('a'));
    graph.addNode(makeNode('b'));
    graph.addEdge({ id: 'ab', from: 'a', to: 'b', kind: 'pipe', conductance: 1 });
    graph.addEdge({ id: 'ba', from: 'b', to: 'a', kind: 'pipe', conductance: 1 });
    expect(() => graph.getTopologicalOrder()).toThrow('Cycle detected');
  });
});
