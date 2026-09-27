import type { Alarm, AuditEvent, Valve } from '../types/plant';
import { commandValve } from './valve';

/**
 * Cause-and-effect (interlock) matrix.
 *
 * Distinct from ESD_MATRIX: an interlock is an *automatic* alarm-driven action,
 * latched at `interlock` priority so neither loop (`auto`) nor the operator
 * (`manual`) can move the valve back until the cause clears and the operator
 * re-commands it.
 */
export interface Interlock {
  id: string;
  /** Tag of the active alarm that triggers the interlock. */
  causeTag: string;
  tags: string[];
  position: number;
  reason: string;
}

export const INTERLOCK_MATRIX: Interlock[] = [
  {
    id: 'ILK-PAH001-SDV026B',
    causeTag: 'PAH-001',
    tags: ['SDV-026B'],
    position: 0,
    reason: 'SB-001 overpressure interlock closes fuel-gas take-off SDV-026B',
  },
];

/**
 * Evaluates the matrix against the current alarm set and issues the commands.
 * Returns the ids of the interlocks whose cause was active this tick.
 */
export function applyInterlocks(
  activeAlarms: Alarm[],
  valves: Map<string, Valve>,
  audit: AuditEvent[],
  t: number
): string[] {
  const fired: string[] = [];
  for (const lock of INTERLOCK_MATRIX) {
    const cause = activeAlarms.find((a) => a.tag === lock.causeTag && a.active);
    if (!cause) {
      // Cause cleared: hand the valve back so the operator can re-open it.
      for (const tag of lock.tags) {
        const valve = valves.get(tag);
        if (valve && valve.lastPriority === 'interlock') valve.lastPriority = 'manual';
      }
      continue;
    }
    fired.push(lock.id);
    for (const tag of lock.tags) {
      const valve = valves.get(tag);
      if (valve) commandValve(valve, lock.position, 'interlock', lock.reason, audit, t);
    }
  }
  return fired;
}
