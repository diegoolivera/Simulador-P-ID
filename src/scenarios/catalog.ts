import type { Scenario } from '../stores/scenarioStore';

export const baseOptions = {
  // Wellhead pressure; the main separator PIC-6505 must be able to reach SP 89.
  sourcePressure: 95,
  // sm3/d per well source; three wells -> ~2.5 MMsm3/d total plant inlet
  sourceFlow: 833_333,
  sourceLiquidFraction: 0.02,
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
    { kind: 'level', tag: 'SB-001', field: 'liquidLevel', threshold: 70, comparator: '<' },
  ],
    fail: [{ kind: 'alarm', tag: 'LAHH-6505' }, { kind: 'alarm', tag: 'PAHH-6505' }],
};

export const esdFireScenario: Scenario = {
  id: 'esd-fire',
  title: 'ESD Fire',
  description: 'A confirmed fire triggers ESD1. Reset only when safe.',
  duration: 60,
  baseOptions,
  triggers: [{ at: 2, kind: 'esd', payload: { level: 1 } }],
  win: [{ kind: 'time', threshold: 20 }, { kind: 'esd', threshold: 1, comparator: '<' }],
  // Only a timeout can fail this one. The previous `esd > 0` rule was checked
  // on every tick *before* win, so the scenario was lost at t=2 — the same tick
  // its own trigger fires — and recovery was impossible by construction.
  fail: [{ kind: 'time', threshold: 60 }],
};

/**
 * Nivel 2 (PID): the inlet steps +20% while PIC-6505 is holding SP 89. The
 * trainee watches PV-6505 modulate PV-6505 and judges damping vs overshoot.
 */
export const inletStepScenario: Scenario = {
  id: 'inlet-step',
  title: 'Inlet +20% (PID)',
  description: 'Plant inlet jumps 20%. Observe how PV-6505 damps the disturbance.',
  duration: 180,
  baseOptions,
  triggers: [{ at: 20, kind: 'inlet', payload: { sourceFlow: 1_000_000 } }],
  win: [{ kind: 'time', threshold: 120 }],
  fail: [{ kind: 'alarm', tag: 'PAHH-6505' }],
};

export const SCENARIO_CATALOG: Record<string, Scenario> = {
  [normalOperationScenario.id]: normalOperationScenario,
  [slugResponseScenario.id]: slugResponseScenario,
  [esdFireScenario.id]: esdFireScenario,
  [inletStepScenario.id]: inletStepScenario,
};
