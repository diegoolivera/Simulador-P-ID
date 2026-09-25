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
  { id: 'PAH-101', tag: 'PAH-101', description: 'High pressure SB-001', priority: 'HIGH', sourceTag: 'SB-001', field: 'pressure', threshold: 75, comparator: '>' },
  { id: 'PAHH-101', tag: 'PAHH-101', description: 'Very high pressure SB-001', priority: 'CRITICAL', sourceTag: 'SB-001', field: 'pressure', threshold: 85, comparator: '>' },
  { id: 'PAL-101', tag: 'PAL-101', description: 'Low pressure SB-001', priority: 'LOW', sourceTag: 'SB-001', field: 'pressure', threshold: 60, comparator: '<' },
  { id: 'LAH-001', tag: 'LAH-001', description: 'High level SB-001', priority: 'HIGH', sourceTag: 'SB-001', field: 'liquidLevel', threshold: 7, comparator: '>' },
  { id: 'LAHH-001', tag: 'LAHH-001', description: 'Very high level SB-001', priority: 'CRITICAL', sourceTag: 'SB-001', field: 'liquidLevel', threshold: 9, comparator: '>' },
  { id: 'LAH-004', tag: 'LAH-004', description: 'High level SB-004', priority: 'HIGH', sourceTag: 'SB-004', field: 'liquidLevel', threshold: 7, comparator: '>' },
  { id: 'PDAH-004', tag: 'PDAH-004', description: 'High dP demister SB-004', priority: 'HIGH', sourceTag: 'SB-004', field: 'demisterDP', threshold: 5, comparator: '>' },
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
