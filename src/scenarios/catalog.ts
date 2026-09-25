import type { Scenario } from '../stores/scenarioStore';

const baseOptions = {
  sourcePressure: 80,
  sourceFlow: 100,
  sourceLiquidFraction: 0.1,
  sourceSandFraction: 0.01,
};

export const normalOperationScenario: Scenario = {
  id: 'normal-operation',
  title: 'Normal Operation',
  description: 'Maintain steady inlet separation under normal well flow.',
  duration: 10,
  baseOptions,
  triggers: [],
  win: [{ kind: 'time', threshold: 10 }],
  fail: [],
};

export const slugResponseScenario: Scenario = {
  id: 'slug-response',
  title: 'Slug Response',
  description: 'A liquid slug enters SB-001. Keep level below LAHH and pressure below PAHH.',
  duration: 40,
  baseOptions,
  triggers: [{ at: 5, kind: 'slug', payload: { targetTag: 'SB-001', liquidFlow: 40 } }],
  win: [
    { kind: 'time', threshold: 35 },
    { kind: 'level', tag: 'SB-001', field: 'liquidLevel', threshold: 7, comparator: '<' },
  ],
  fail: [{ kind: 'alarm', tag: 'LAHH-001' }, { kind: 'alarm', tag: 'PAHH-101' }],
};

export const esdFireScenario: Scenario = {
  id: 'esd-fire',
  title: 'ESD Fire',
  description: 'A confirmed fire triggers ESD1. Reset only when safe.',
  duration: 60,
  baseOptions,
  triggers: [{ at: 2, kind: 'esd', payload: { level: 1 } }],
  win: [{ kind: 'time', threshold: 20 }, { kind: 'esd', threshold: 1, comparator: '<' }],
  fail: [{ kind: 'time', threshold: 60 }, { kind: 'esd', threshold: 0, comparator: '>' }],
};

export const SCENARIO_CATALOG: Record<string, Scenario> = {
  [normalOperationScenario.id]: normalOperationScenario,
  [slugResponseScenario.id]: slugResponseScenario,
  [esdFireScenario.id]: esdFireScenario,
};
