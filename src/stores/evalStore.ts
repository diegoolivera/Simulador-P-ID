import { create } from 'zustand';
import type { AuditEvent } from '../types/plant';

export type Severity = 'CRITICAL' | 'PROCESS' | 'EFFICIENCY';

export interface RuleResult {
  id: string;
  severity: Severity;
  message: string;
}

export interface ScoreReport {
  score: number;
  max: number;
  tier: 'EXPERT' | 'PROCESS' | 'TRAINING';
  results: RuleResult[];
}

type State = {
  audit: AuditEvent[];
  violations: RuleResult[];
  report: ScoreReport | null;
  startScenario: () => void;
  record: (events: AuditEvent[]) => void;
  addResult: (result: RuleResult) => void;
  computeScore: () => ScoreReport;
  finalize: () => void;
};

const weight = (s: Severity) => (s === 'CRITICAL' ? 50 : s === 'PROCESS' ? 20 : 10);

export const useEvalStore = create<State>()((set, get) => ({
  audit: [],
  violations: [],
  report: null,
  startScenario: () => set({ audit: [], violations: [], report: null }),
  record: (events) => set((state) => ({ audit: state.audit.concat(events) })),
  addResult: (result) => set((state) => ({ violations: [...state.violations, result] })),
  computeScore: () => {
    let score = 100;
    let critical = false;
    for (const r of get().violations) {
      score -= weight(r.severity);
      if (r.severity === 'CRITICAL') critical = true;
    }
    score = Math.max(0, score);
    const max = critical ? 60 : 100;
    const capped = Math.min(score, max);
    const tier = capped >= 90 ? 'EXPERT' : capped >= 60 ? 'PROCESS' : 'TRAINING';
    return { score: capped, max, tier, results: get().violations };
  },
  finalize: () => set({ report: get().computeScore() }),
}));
