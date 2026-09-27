import { describe, expect, it } from 'vitest';
import { PlantGraph } from './graph';
import { commandValve, createValve } from './valve';
import { stepPhysics } from './physics';
import type { PlantNode } from '../types/plant';

const node = (id: string, kind: PlantNode['kind'] = 'vessel') =>
  ({ id, tag: id, kind, pressure: 0, liquidLevel: 0, sandLevel: 0, volume: 10, inletIds: [], outletIds: [] } as unknown as PlantNode);

const makeTrain = () => {
  const graph = new PlantGraph();
  graph.addNode(node('SRC', 'source'));
  graph.addNode(node('VES'));
  graph.addNode(node('SNK', 'sink'));
  graph.addEdge({ id: 'in', from: 'SRC', to: 'VES', kind: 'valved', conductance: 1, valveTag: 'IN' });
  graph.addEdge({ id: 'out', from: 'VES', to: 'SNK', kind: 'valved', conductance: 1, valveTag: 'OUT' });
  const valves = new Map([
    ['IN', createValve('IN', 'manual', 'FC')],
    ['OUT', createValve('OUT', 'manual', 'FC')],
  ]);
  return { graph, valves };
};

describe('Physics tick', () => {
  it('propagates pressure and raises vessel level', () => {
    const { graph, valves } = makeTrain();
    stepPhysics(graph, valves, 1, { sourceFlow: 100, sourceLiquidFraction: 0.2 });
    expect(graph.nodes.get('VES')!.pressure).toBeGreaterThan(0);
    expect(graph.nodes.get('VES')!.liquidLevel).toBeGreaterThan(0);
  });

  it('closing outlet backs up liquid in vessel', () => {
    const { graph, valves } = makeTrain();
    commandValve(valves.get('OUT')!, 0, 'manual', 'test', [], 0);
    // Large source so liquid accumulation is observable within a few seconds
    stepPhysics(graph, valves, 5, { sourceFlow: 1e9, sourceLiquidFraction: 0.2 });
    expect(graph.nodes.get('VES')!.liquidLevel).toBeGreaterThan(graph.nodes.get('VES')!.volume * 0.5);
  });

  it('ESD closes SDV and opens BDV', () => {
    const sdv = createValve('SDV-001B', 'sdv', 'FC');
    const bdv = createValve('BDV-6505', 'bdv', 'FO');
    const valves = new Map([['SDV-001B', sdv], ['BDV-6505', bdv]]);
    const graph = new PlantGraph();
    graph.addNode(node('VES'));
    stepPhysics(graph, valves, 2, { esdLevel: 1 });
    expect(sdv.targetPosition).toBe(0);
    expect(bdv.targetPosition).toBe(1);
    expect(sdv.position).toBeLessThan(1);
  });

  it('slug injection raises target vessel level predictably', () => {
    const { graph, valves } = makeTrain();
    const before = graph.nodes.get('VES')!.liquidLevel;
    stepPhysics(graph, valves, 1, { slug: { targetTag: 'VES', liquidFlow: 100 } });
    expect(graph.nodes.get('VES')!.liquidLevel).toBeGreaterThan(before + 5);
  });
});
