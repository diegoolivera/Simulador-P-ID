import { describe, expect, it } from 'vitest';
import { PlantGraph } from './graph';
import { createLoop, PHASE1_LOOPS, stepLoops } from './loops';
import { createValve } from './valve';
import type { AuditEvent, PlantNode } from '../types/plant';

const node = (id: string, kind: PlantNode['kind'] = 'vessel') =>
  ({ id, tag: id, kind, pressure: 0, liquidLevel: 0, sandLevel: 0, volume: 10, inletIds: [], outletIds: [] } as unknown as PlantNode);

describe('Control loops', () => {
  it('PIC opens PV when pressure is above setpoint', () => {
    const graph = new PlantGraph();
    graph.addNode(node('V-6505'));
    graph.nodes.get('V-6505')!.pressure = 96;
    const loop = createLoop(PHASE1_LOOPS[0]);
    const valve = createValve('PV-6505', 'control', 'FC');
    const audit: AuditEvent[] = [];
    stepLoops([loop], graph, new Map([['PV-6505', valve]]), false, 1, audit, 0);
    expect(loop.output).toBeGreaterThan(0);
    expect(valve.targetPosition).toBeGreaterThan(0);
  });

  it('ESD forces MAN mode and resets integral', () => {
    const graph = new PlantGraph();
    graph.addNode(node('V-6505'));
    const loop = createLoop(PHASE1_LOOPS[0]);
    loop.integral = 5;
    stepLoops([loop], graph, new Map(), true, 1, [], 0);
    expect(loop.mode).toBe('MAN');
    expect(loop.integral).toBe(0);
  });
});
