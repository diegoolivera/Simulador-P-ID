import { commandValve } from './valve';
import type { Alarm, AuditEvent, Valve } from '../types/plant';
import type { PlantGraph } from './graph';

export type EsdLevel = 0 | 1 | 2 | 3;

export interface EsdAction { tags: string[]; position: number; reason: string; }

const CLOSE_ALL = ['V-IN-009', 'V-OUT-009', 'V-IN-001', 'V-OUT-001', 'V-IN-004', 'SDV-031A', 'SDV-032A', 'FV-185', 'FV-186', 'SDV-11OUT', 'SDV-12OUT', 'LV-11LIQ', 'LV-12LIQ', 'LV-KG31LIQ', 'LV-002', 'LV-003', 'BA-051', 'BA-052', 'SDV-OUT-004', 'SDV-001B'];
const VENT = ['BDV-6505', 'VT-004'];

export const ESD_MATRIX: Record<EsdLevel, EsdAction[]> = {
  0: [],
  1: [
    { tags: CLOSE_ALL, position: 0, reason: 'ESD1 fail-close' },
    { tags: VENT, position: 1, reason: 'ESD1 blowdown open' },
  ],
  2: [
    { tags: ['V-IN-009', 'V-OUT-009'], position: 0, reason: 'ESD2 isolate SB-009' },
    { tags: ['BDV-6505'], position: 1, reason: 'ESD2 depressurise V-6505' },
  ],
  3: [
    { tags: ['V-IN-001', 'V-OUT-001', 'V-IN-004', 'SDV-031A', 'SDV-032A', 'FV-185', 'FV-186', 'SDV-11OUT', 'SDV-12OUT', 'LV-11LIQ', 'LV-12LIQ', 'LV-KG31LIQ', 'LV-002', 'LV-003', 'BA-051', 'BA-052', 'SDV-OUT-004'], position: 0, reason: 'ESD3 isolate train' },
    { tags: VENT, position: 1, reason: 'ESD3 vent to flare' },
  ],
};

export function applyEsd(level: EsdLevel, valves: Map<string, Valve>, audit: AuditEvent[], t: number): void {
  for (const action of ESD_MATRIX[level] ?? []) {
    for (const tag of action.tags) {
      const valve = valves.get(tag);
      if (valve) commandValve(valve, action.position, 'esd', action.reason, audit, t);
    }
  }
}

export function canResetEsd(level: EsdLevel, alarms: Alarm[], checklistComplete: boolean): boolean {
  if (level === 0) return false;
  if (!checklistComplete) return false;
  return !alarms.some((a) => a.priority === 'CRITICAL' && a.active);
}

export function checkEsdEscalation(graph: PlantGraph): EsdLevel | null {
  const v6505 = graph.nodes.get('V-6505');
  if (v6505 && v6505.pressure > 95 && v6505.liquidLevel > 90) return 2;
  return null;
}
