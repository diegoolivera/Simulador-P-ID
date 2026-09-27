import { describe, expect, it } from 'vitest';
import { applyAirFailure, commandValve, createValve, setLock, stepValveStrokes } from './valve';
import type { AuditEvent, Valve } from '../types/plant';

const makeValve = (): Valve => createValve('XV-001', 'manual', 'FC');

describe('Valve state machine', () => {
  it('strokes toward target', () => {
    const v = makeValve();
    v.targetPosition = 0;
    stepValveStrokes([v], 1);
    expect(v.position).toBeCloseTo(0.5);
  });

  it('rejects commands below active priority', () => {
    const v = makeValve(), audit: AuditEvent[] = [];
    commandValve(v, 0.5, 'auto', 'loop', audit, 0);
    expect(commandValve(v, 0, 'manual', 'operator', audit, 0)).toBe(false);
    expect(v.targetPosition).toBe(0.5);
  });

  it('esd overrides manual', () => {
    const v = makeValve(), audit: AuditEvent[] = [];
    commandValve(v, 0.5, 'manual', 'operator', audit, 0);
    expect(commandValve(v, 0, 'esd', 'ESD1', audit, 0)).toBe(true);
    expect(v.targetPosition).toBe(0);
  });

  it('locked valve rejects every command', () => {
    const v = makeValve();
    setLock(v, true);
    expect(commandValve(v, 0, 'esd', 'ESD1', [], 0)).toBe(false);
  });

  it('air failure drives FC closed and FO open', () => {
    const fc = createValve('XV-001', 'manual', 'FC');
    const fo = createValve('BDV-6505', 'bdv', 'FO');
    const audit: AuditEvent[] = [];
    applyAirFailure([fc, fo], audit, 0);
    expect(fc.targetPosition).toBe(0);
    expect(fo.targetPosition).toBe(1);
  });
});
