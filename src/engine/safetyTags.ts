import { PHASE1_ALARM_RULES } from './alarms';
import { ESD_MATRIX } from './esd';
import { INTERLOCK_MATRIX } from './interlock';

/**
 * Valves no matrix mentions, but that every consumer reads through a
 * fail-open default — so deleting them silently disarms a safety function:
 *
 * - `SDV-006A` and `PCV-700`: `fuelGas.ts` / `simulationStore.ts` fall back to
 *   "open" when the valve is missing, so the skid keeps burning with no
 *   isolation valve on the page.
 * - `SDV-007`: `simulationStore.ts` falls back to "instrument air available",
 *   so the failsafe path can never trip again.
 *
 * This is the manual half of `SAFETY_TAGS`, kept beside the matrices so the
 * derivation stays reviewable. Every entry must name the consumer whose
 * default hides the gap — do not add tags here just because they look
 * important.
 */
const DEFAULT_SAFE_TAGS = ['SDV-006A', 'PCV-700', 'SDV-007'];

/**
 * Tags the P&ID editor must refuse to delete.
 *
 * Deleting a node is not a cosmetic change: `evaluateAlarmRules` skips any rule
 * whose `sourceTag` node no longer exists, so removing `SB-001` silently
 * disarms `PAH-001` — and therefore the PAH-001 -> SDV-026B interlock — with no
 * alarm and no audit trail to say so. A missing valve is worse still: every
 * consumer treats it as open or as present, never as tripped.
 *
 * Derived from the alarm, ESD and interlock matrices so a new entry is
 * protected automatically, plus the fail-open valves above.
 */
export const SAFETY_TAGS: ReadonlySet<string> = (() => {
  const tags = new Set<string>(DEFAULT_SAFE_TAGS);
  for (const rule of PHASE1_ALARM_RULES) {
    if (rule.sourceTag) tags.add(rule.sourceTag);
  }
  for (const actions of Object.values(ESD_MATRIX)) {
    for (const action of actions) {
      for (const tag of action.tags) tags.add(tag);
    }
  }
  for (const lock of INTERLOCK_MATRIX) {
    tags.add(lock.causeTag);
    for (const tag of lock.tags) tags.add(tag);
  }
  return tags;
})();
