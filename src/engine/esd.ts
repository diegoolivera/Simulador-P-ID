import { commandValve } from './valve';
import type { AuditEvent, Valve } from '../types/plant';

export type EsdLevel = 0 | 1 | 2 | 3;

export interface EsdAction { tags: string[]; position: number; reason: string; }

const CLOSE_ALL = ['V-IN-009', 'V-OUT-009', 'V-IN-001', 'V-OUT-001', 'V-IN-004', 'SDV-OUT-004', 'SDV-001B'];
const VENT = ['BDV-001A', 'VT-004'];

export const ESD_MATRIX: Record<EsdLevel, EsdAction[]> = {
  0: [],
  1: [
    { tags: CLOSE_ALL, position: 0, reason: 'ESD1 fail-close' },
    { tags: VENT, position: 1, reason: 'ESD1 blowdown open' },
  ],
  2: [
    { tags: ['V-IN-009', 'V-OUT-009'], position: 0, reason: 'ESD2 isolate SB-009' },
    { tags: ['BDV-001A'], position: 1, reason: 'ESD2 depressurise SB-001' },
  ],
  3: [
    { tags: ['V-IN-001', 'V-OUT-001', 'V-IN-004', 'SDV-OUT-004'], position: 0, reason: 'ESD3 isolate train' },
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
