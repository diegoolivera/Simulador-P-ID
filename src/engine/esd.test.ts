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
    const bdv = createValve('BDV-001A', 'bdv', 'FO');
    applyEsd(1, new Map([['SDV-001B', sdv], ['BDV-001A', bdv]]), [], 0);
    expect(sdv.targetPosition).toBe(0);
    expect(bdv.targetPosition).toBe(1);
  });

  it('reset is blocked by active CRITICAL alarm', () => {
    const alarm: Alarm = { id: 'PAHH-101', tag: 'PAHH-101', description: '', priority: 'CRITICAL', active: true, acknowledged: false, t: 0, processValue: 90, threshold: 85 };
    expect(canResetEsd(1, [alarm], true)).toBe(false);
  });

  it('reset is blocked until checklist is complete', () => {
    expect(canResetEsd(1, [], false)).toBe(false);
    expect(canResetEsd(1, [], true)).toBe(true);
  });

  it('auto-escalates when SB-001 pressure and level are HIHI', () => {
    const graph = new PlantGraph();
    graph.addNode(node('SB-001'));
    graph.nodes.get('SB-001')!.pressure = 86;
    graph.nodes.get('SB-001')!.liquidLevel = 9.5;
    expect(checkEsdEscalation(graph)).toBe(2);
  });
});
