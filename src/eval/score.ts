import type { RuleResult, Severity } from './rules';

const WEIGHT: Record<Severity, number> = {
  CRITICAL: 50,
  PROCESS: 20,
  EFFICIENCY: 10,
};

export type Tier = 'EXPERT' | 'PROCESS' | 'TRAINING';

export interface ScoreReport {
  score: number;
  max: number;
  tier: Tier;
  results: RuleResult[];
}

export function computeScore(results: RuleResult[]): ScoreReport {
  let score = 100;
  let critical = false;
  for (const r of results) {
    score -= WEIGHT[r.severity];
    if (r.severity === 'CRITICAL') critical = true;
  }
  score = Math.max(0, score);
  const max = critical ? 60 : 100;
  const capped = Math.min(score, max);
  const tier = critical ? 'PROCESS' : capped >= 90 ? 'EXPERT' : capped >= 60 ? 'PROCESS' : 'TRAINING';
  return { score: capped, max, tier, results };
}
