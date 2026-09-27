import { describe, expect, it } from 'vitest';
import { PlantGraph } from './graph';
import { acknowledgeAlarm, evaluateAlarms, PHASE1_ALARM_RULES, shelveAlarm } from './alarms';
import type { PlantNode } from '../types/plant';

const node = (id: string, kind: PlantNode['kind'] = 'vessel') =>
  ({ id, tag: id, kind, pressure: 0, liquidLevel: 0, sandLevel: 0, volume: 10, inletIds: [], outletIds: [] } as unknown as PlantNode);

describe('Alarm evaluator', () => {
  it('triggers high and high-high pressure alarms', () => {
    const graph = new PlantGraph();
    graph.addNode(node('V-6505'));
    graph.nodes.get('V-6505')!.pressure = 96;
    const alarms = evaluateAlarms(graph, PHASE1_ALARM_RULES, [], 0);
    expect(alarms.some((a) => a.id === 'PAH-6505')).toBe(true);
    expect(alarms.some((a) => a.id === 'PAHH-6505')).toBe(true);
  });

  it('clears alarm when value returns to normal', () => {
    const graph = new PlantGraph();
    graph.addNode(node('V-6505'));
    graph.nodes.get('V-6505')!.pressure = 96;
    let alarms = evaluateAlarms(graph, PHASE1_ALARM_RULES, [], 0);
    graph.nodes.get('V-6505')!.pressure = 89;
    alarms = evaluateAlarms(graph, PHASE1_ALARM_RULES, alarms, 1);
    expect(alarms.some((a) => a.id === 'PAH-6505')).toBe(false);
  });

  it('acknowledge preserves alarm entry', () => {
    const graph = new PlantGraph();
    graph.addNode(node('V-6505'));
    graph.nodes.get('V-6505')!.pressure = 96;
    const alarms = evaluateAlarms(graph, PHASE1_ALARM_RULES, [], 0);
    acknowledgeAlarm(alarms[0]);
    expect(alarms[0].acknowledged).toBe(true);
    expect(alarms[0].active).toBe(true);
  });

  it('shelves non-critical alarms', () => {
    const alarm = { id: 'PAL-6505', tag: 'PAL-6505', description: 'Low pressure', priority: 'LOW' as const, active: true, acknowledged: false, t: 0, processValue: 80, threshold: 85, shelvedUntil: undefined };
    shelveAlarm(alarm, 0, 10);
    expect(alarm.shelvedUntil).toBe(10);
  });
});
