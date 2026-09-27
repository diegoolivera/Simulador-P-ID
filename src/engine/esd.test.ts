import { describe, expect, it } from 'vitest';
import { PlantGraph } from './graph';
import { applyEsd, canResetEsd, checkEsdEscalation } from './esd';
import { createValve } from './valve';
import type { Alarm, PlantNode } from '../types/plant';

const node = (id: string, kind: PlantNode['kind'] = 'vessel') =>
  ({ id, tag: id, kind, pressure: 0, liquidLevel: 0, sandLevel: 0, volume: 10, inletIds: [], outletIds: [] } as unknown as PlantNode);

describe('ESD matrix', () => {
  it('ESD1 closes SDV and opens BDV', () => {
    const sdv = createValve('SDV-001B', 'sdv', 'FC');
    const bdv = createValve('BDV-6505', 'bdv', 'FO');
    applyEsd(1, new Map([['SDV-001B', sdv], ['BDV-6505', bdv]]), [], 0);
    expect(sdv.targetPosition).toBe(0);
    expect(bdv.targetPosition).toBe(1);
    applyEsd(2, new Map([['SDV-001B', sdv], ['BDV-6505', bdv]]), [], 0);
    expect(bdv.targetPosition).toBe(1);
  });

  it('reset is blocked by active CRITICAL alarm', () => {
    const alarm: Alarm = { id: 'PAHH-6505', tag: 'PAHH-6505', description: '', priority: 'CRITICAL', active: true, acknowledged: false, t: 0, processValue: 96, threshold: 95 };
    expect(canResetEsd(1, [alarm], true)).toBe(false);
  });

  it('reset is blocked until checklist is complete', () => {
    expect(canResetEsd(1, [], false)).toBe(false);
    expect(canResetEsd(1, [], true)).toBe(true);
  });

  it('auto-escalates when V-6505 pressure and level are HIHI', () => {
    const graph = new PlantGraph();
    graph.addNode(node('V-6505'));
    graph.nodes.get('V-6505')!.pressure = 96;
    graph.nodes.get('V-6505')!.liquidLevel = 95;
    expect(checkEsdEscalation(graph)).toBe(2);
  });
});
