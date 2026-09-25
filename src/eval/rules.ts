import type { AuditEvent } from '../types/plant';

export type Severity = 'CRITICAL' | 'PROCESS' | 'EFFICIENCY';

export interface RuleResult {
  id: string;
  severity: Severity;
  message: string;
}

const LOTO_STEP = /^LOTO-(SB-\d{3})-(bypass|block|vent|drain|lock|complete)$/;
const ROUND_COMPLETE = /^ROUND-(train|tanks|flare)-complete$/;

export function evaluateRules(audit: AuditEvent[]): RuleResult[] {
  const results: RuleResult[] = [];
  const bypassIdx = new Map<string, number>();

  for (let i = 0; i < audit.length; i++) {
    const e = audit[i];
    const loto = LOTO_STEP.exec(e.field);
    if (loto) {
      const vessel = loto[1];
      const step = loto[2];
      if (step === 'bypass' && Number(e.to) >= 0.95) {
        bypassIdx.set(vessel, i);
      }
      if (step === 'block' && Number(e.to) <= 0.05) {
        const bi = bypassIdx.get(vessel);
        if (bi === undefined || bi > i) {
          results.push({
            id: `loto-bypass-${vessel}`,
            severity: 'CRITICAL',
            message: `${vessel} block valve closed before bypass was fully open`,
          });
        }
      }
    }

    const round = ROUND_COMPLETE.exec(e.field);
    if (round && typeof e.reason === 'string' && e.reason.startsWith('missing-critical')) {
      results.push({
        id: `round-${round[1]}`,
        severity: 'PROCESS',
        message: `Critical item missed during ${round[1]} round`,
      });
    }
  }

  return results;
}
