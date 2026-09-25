import { describe, expect, it } from 'vitest';
import type { AuditEvent } from '../types/plant';
import { evaluateRules } from './rules';
import { computeScore } from './score';

const loto = (field: string, to: number | string): AuditEvent => ({
  t: 0, source: 'operator', tag: 'LOTO-SB-001', field, from: 0, to, reason: 'LOTO',
});

describe('eval rules', () => {
  it('flags block valve closed before bypass', () => {
    const results = evaluateRules([loto('LOTO-SB-001-block', 0), loto('LOTO-SB-001-bypass', 1)]);
    expect(results[0].severity).toBe('CRITICAL');
  });
  it('accepts correct LOTO order', () => {
    expect(evaluateRules([loto('LOTO-SB-001-bypass', 1), loto('LOTO-SB-001-block', 0)])).toHaveLength(0);
  });
  it('flags missed critical round item', () => {
    const audit: AuditEvent[] = [{ t: 0, source: 'operator', tag: 'ROUND-train', field: 'ROUND-train-complete', from: 'pending', to: 'complete', reason: 'missing-critical:x' }];
    expect(evaluateRules(audit)[0].severity).toBe('PROCESS');
  });
});

describe('eval score', () => {
  it('caps CRITICAL violations at PROCESS tier', () => {
    const report = computeScore([{ id: 'x', severity: 'CRITICAL', message: 'unsafe' }]);
    expect(report.max).toBe(60);
    expect(report.tier).toBe('PROCESS');
  });
  it('returns EXPERT with no violations', () => {
    expect(computeScore([]).tier).toBe('EXPERT');
  });
});
