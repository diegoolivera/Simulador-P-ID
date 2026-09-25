import { describe, expect, it } from 'vitest';
import type { AuditEvent } from '../types/plant';
import { filterBy, latest } from './audit';

const events: AuditEvent[] = [
  { t: 0, source: 'operator', tag: 'V-IN-009', field: 'targetPosition', from: 0, to: 1, reason: 'open' },
  { t: 1, source: 'operator', tag: 'V-IN-009', field: 'locked', from: 'unlocked', to: 'locked', reason: 'LOTO' },
  { t: 2, source: 'esd', tag: 'SDV-201', field: 'targetPosition', from: 1, to: 0, reason: 'ESD1' },
];

describe('audit helpers', () => {
  it('filters events by key and value', () => {
    expect(filterBy(events, 'tag', 'V-IN-009')).toHaveLength(2);
    expect(filterBy(events, 'source', 'esd')).toHaveLength(1);
    expect(filterBy(events, 'field', 'missing')).toHaveLength(0);
  });

  it('returns the latest event', () => {
    expect(latest(events)?.tag).toBe('SDV-201');
    expect(latest([])).toBeUndefined();
  });
});
