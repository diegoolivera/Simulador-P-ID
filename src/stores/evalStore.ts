import { create } from 'zustand';
import type { AuditEvent } from '../types/plant';
import { evaluateRules } from '../eval/rules';
import { computeScore as calculateScore } from '../eval/score';
import type { RuleResult } from '../eval/rules';
import type { ScoreReport } from '../eval/score';

export type { Severity, RuleResult } from '../eval/rules';
export type { ScoreReport } from '../eval/score';

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

const allResults = (state: { audit: AuditEvent[]; violations: RuleResult[] }): RuleResult[] => [
  ...state.violations,
  ...evaluateRules(state.audit),
];

export const useEvalStore = create<State>()((set, get) => ({
  audit: [],
  violations: [],
  report: null,
  startScenario: () => set({ audit: [], violations: [], report: null }),
  record: (events) => set((state) => ({ audit: state.audit.concat(events) })),
  addResult: (result) => set((state) => ({ violations: [...state.violations, result] })),
  computeScore: () => calculateScore(allResults(get())),
  finalize: () => set({ report: calculateScore(allResults(get())) }),
}));
