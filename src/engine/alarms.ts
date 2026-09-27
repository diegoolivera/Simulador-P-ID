import type { Alarm, AlarmPriority } from '../types/plant';
import type { PlantGraph } from './graph';

export interface AlarmRule {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
  sourceTag: string;
  field: 'pressure' | 'liquidLevel' | 'demisterDP';
  threshold: number;
  comparator: '>' | '<';
}

export const PHASE1_ALARM_RULES: AlarmRule[] = [
  { id: 'PAH-6505', tag: 'PAH-6505', description: 'High pressure V-6505', priority: 'HIGH', sourceTag: 'V-6505', field: 'pressure', threshold: 92, comparator: '>' },
  { id: 'PAHH-6505', tag: 'PAHH-6505', description: 'Very high pressure V-6505', priority: 'CRITICAL', sourceTag: 'V-6505', field: 'pressure', threshold: 95, comparator: '>' },
  { id: 'PAL-6505', tag: 'PAL-6505', description: 'Low pressure V-6505', priority: 'LOW', sourceTag: 'V-6505', field: 'pressure', threshold: 85, comparator: '<' },
  { id: 'LAH-6505', tag: 'LAH-6505', description: 'High level V-6505', priority: 'HIGH', sourceTag: 'V-6505', field: 'liquidLevel', threshold: 70, comparator: '>' },
  { id: 'LAHH-6505', tag: 'LAHH-6505', description: 'Very high level V-6505', priority: 'CRITICAL', sourceTag: 'V-6505', field: 'liquidLevel', threshold: 90, comparator: '>' },
  { id: 'LAL-6505', tag: 'LAL-6505', description: 'Low level V-6505', priority: 'LOW', sourceTag: 'V-6505', field: 'liquidLevel', threshold: 20, comparator: '<' },
  { id: 'PAH-001', tag: 'PAH-001', description: 'High pressure SB-001', priority: 'HIGH', sourceTag: 'SB-001', field: 'pressure', threshold: 96, comparator: '>' },
  { id: 'LAH-004', tag: 'LAH-004', description: 'High level SB-004', priority: 'HIGH', sourceTag: 'SB-004', field: 'liquidLevel', threshold: 70, comparator: '>' },
  { id: 'PDAH-004', tag: 'PDAH-004', description: 'High dP demister SB-004', priority: 'HIGH', sourceTag: 'SB-004', field: 'demisterDP', threshold: 5, comparator: '>' },
  { id: 'PAH-KG31', tag: 'PAH-KG31', description: 'High suction pressure KG-31', priority: 'HIGH', sourceTag: 'KG-31', field: 'pressure', threshold: 55, comparator: '>' },
  { id: 'PAL-KG31', tag: 'PAL-KG31', description: 'Low suction pressure KG-31', priority: 'LOW', sourceTag: 'KG-31', field: 'pressure', threshold: 45, comparator: '<' },
  { id: 'PAH-TC11', tag: 'PAH-TC11', description: 'High pressure TC-11', priority: 'HIGH', sourceTag: 'TC-11', field: 'pressure', threshold: 90, comparator: '>' },
  { id: 'PAL-TC11', tag: 'PAL-TC11', description: 'Low pressure TC-11', priority: 'LOW', sourceTag: 'TC-11', field: 'pressure', threshold: 75, comparator: '<' },
  { id: 'PAH-TC12', tag: 'PAH-TC12', description: 'High pressure TC-12', priority: 'HIGH', sourceTag: 'TC-12', field: 'pressure', threshold: 90, comparator: '>' },
  { id: 'PAL-TC12', tag: 'PAL-TC12', description: 'Low pressure TC-12', priority: 'LOW', sourceTag: 'TC-12', field: 'pressure', threshold: 75, comparator: '<' },
  { id: 'LAH-002', tag: 'LAH-002', description: 'High level ST-002', priority: 'HIGH', sourceTag: 'ST-002', field: 'liquidLevel', threshold: 80, comparator: '>' },
  { id: 'LAHH-002', tag: 'LAHH-002', description: 'Very high level ST-002', priority: 'CRITICAL', sourceTag: 'ST-002', field: 'liquidLevel', threshold: 95, comparator: '>' },
  { id: 'LAL-002', tag: 'LAL-002', description: 'Low level ST-002', priority: 'LOW', sourceTag: 'ST-002', field: 'liquidLevel', threshold: 20, comparator: '<' },
  { id: 'LAH-003', tag: 'LAH-003', description: 'High level ST-003', priority: 'HIGH', sourceTag: 'ST-003', field: 'liquidLevel', threshold: 80, comparator: '>' },
  { id: 'LAHH-003', tag: 'LAHH-003', description: 'Very high level ST-003', priority: 'CRITICAL', sourceTag: 'ST-003', field: 'liquidLevel', threshold: 95, comparator: '>' },
  { id: 'LAL-003', tag: 'LAL-003', description: 'Low level ST-003', priority: 'LOW', sourceTag: 'ST-003', field: 'liquidLevel', threshold: 20, comparator: '<' },
  { id: 'LAH-TKAG41', tag: 'LAH-TKAG41', description: 'High level TKAG-41', priority: 'HIGH', sourceTag: 'TKAG-41', field: 'liquidLevel', threshold: 85, comparator: '>' },
  { id: 'LAL-TKAG41', tag: 'LAL-TKAG41', description: 'Low level TKAG-41', priority: 'LOW', sourceTag: 'TKAG-41', field: 'liquidLevel', threshold: 15, comparator: '<' },
  { id: 'LAH-TKAG42', tag: 'LAH-TKAG42', description: 'High level TKAG-42', priority: 'HIGH', sourceTag: 'TKAG-42', field: 'liquidLevel', threshold: 85, comparator: '>' },
  { id: 'LAL-TKAG42', tag: 'LAL-TKAG42', description: 'Low level TKAG-42', priority: 'LOW', sourceTag: 'TKAG-42', field: 'liquidLevel', threshold: 15, comparator: '<' },
];

export function evaluateAlarms(graph: PlantGraph, rules: AlarmRule[], active: Alarm[], t: number): Alarm[] {
  const next = new Map<string, Alarm>();
  for (const a of active) next.set(a.id, a);
  for (const rule of rules) {
    const node = graph.nodes.get(rule.sourceTag);
    if (!node) continue;
    const value = node[rule.field];
    const triggered = rule.comparator === '>' ? value > rule.threshold : value < rule.threshold;
    if (triggered) {
      const existing = next.get(rule.id);
      if (existing) {
        existing.active = true;
        existing.processValue = value;
      } else {
        next.set(rule.id, { id: rule.id, tag: rule.tag, description: rule.description, priority: rule.priority, active: true, acknowledged: false, t, processValue: value, threshold: rule.threshold });
      }
    } else {
      const existing = next.get(rule.id);
      if (existing) existing.active = false;
    }
  }
  return Array.from(next.values()).filter((a) => a.active);
}

export function acknowledgeAlarm(alarm: Alarm): void {
  alarm.acknowledged = true;
}

export function shelveAlarm(alarm: Alarm, t: number, duration: number): void {
  if (alarm.priority !== 'CRITICAL') alarm.shelvedUntil = t + duration;
}
