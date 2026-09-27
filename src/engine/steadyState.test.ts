import { beforeAll, describe, expect, it } from 'vitest';
import { useSimulationStore } from '../stores/simulationStore';
import { useScenarioStore } from '../stores/scenarioStore';
import { createPhase1Graph } from '../data/phase1';

/**
 * Exam baseline: after 600 s of normal operation the plant must be a working
 * separation train — 2.5 MM sm3/d exported, loops in band, no high-pressure
 * alarms, liquid reaching the storage tanks. Locks the CRITICAL fixes:
 * FIC direct action, gas-blocked liquid lines, initial levels, fresh graphs.
 */
const TICKS = 600;

type SimState = ReturnType<typeof useSimulationStore.getState>;
let state: SimState;

const activeTag = (s: SimState, tag: string) =>
  s.activeAlarms.some((a) => a.tag === tag && a.active);

beforeAll(() => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().loadScenario('normal-operation');
  useSimulationStore.getState().setRunning(true);
  for (let i = 0; i < TICKS; i += 1) useSimulationStore.getState().tick(1);
  state = useSimulationStore.getState();
}, 60_000);

describe('Normal operation steady state (exam baseline)', () => {
  it('exports ~2.5 MM sm3/d through SALES-GAS', () => {
    const sales = state.graph.nodes.get('SALES-GAS')!;
    expect(sales.gasFlow).toBeGreaterThan(2_125_000);
    expect(sales.gasFlow).toBeLessThan(2_875_000);
  });

  it('keeps both FICs in a controllable band (not pegged)', () => {
    for (const tag of ['FIC-185', 'FIC-186']) {
      const loop = state.loops.find((l) => l.tag === tag)!;
      expect(loop.output).toBeGreaterThan(0.1);
      expect(loop.output).toBeLessThan(0.9);
    }
  });

  it('holds V-6505 pressure near PIC-6505 setpoint 89', () => {
    const v6505 = state.graph.nodes.get('V-6505')!;
    expect(v6505.pressure).toBeGreaterThanOrEqual(85);
    expect(v6505.pressure).toBeLessThanOrEqual(93);
  });

  it('clears high-pressure and low-level alarms in normal operation', () => {
    for (const tag of ['PAH-KG31', 'PAH-6505', 'PAHH-6505', 'PAL-KG31', 'PAL-TC11', 'PAL-TC12', 'LAL-6505', 'LAL-002', 'LAL-003', 'LAL-TKAG41', 'LAL-TKAG42']) {
      expect(activeTag(state, tag), `${tag} must be inactive at t=${state.t}`).toBe(false);
    }
  });

  it('keeps LIC vessels near setpoint and delivers liquid to storage tanks', () => {
    for (const tag of ['V-6505', 'ST-002', 'ST-003']) {
      const level = state.graph.nodes.get(tag)!.liquidLevel;
      expect(level, `${tag} level`).toBeGreaterThanOrEqual(15);
      expect(level, `${tag} level`).toBeLessThanOrEqual(70);
    }
    for (const tag of ['TKAG-41', 'TKAG-42']) {
      const node = state.graph.nodes.get(tag)!;
      expect(node.liquidLevel, `${tag} level`).toBeGreaterThanOrEqual(15);
      expect(node.liquidFlow, `${tag} liquidFlow`).toBeGreaterThan(0);
    }
    expect(state.graph.nodes.get('DISPATCH')!.liquidFlow).toBeGreaterThan(0);
  });

  it('stays numerically clean on every node', () => {
    for (const node of state.graph.nodes.values()) {
      expect(Number.isFinite(node.pressure), `${node.tag} pressure finite`).toBe(true);
      expect(Number.isFinite(node.gasFlow), `${node.tag} gasFlow finite`).toBe(true);
      expect(Number.isFinite(node.liquidFlow), `${node.tag} liquidFlow finite`).toBe(true);
      expect(node.pressure, `${node.tag} pressure >= 0`).toBeGreaterThanOrEqual(0);
      expect(node.liquidLevel, `${node.tag} level <= 100`).toBeLessThanOrEqual(100);
      expect(node.liquidLevel, `${node.tag} level >= 0`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('createPhase1Graph isolation', () => {
  it('returns pristine nodes on every call (no state leak across init)', () => {
    const a = createPhase1Graph();
    a.nodes.get('V-6505')!.pressure = 123;
    a.nodes.get('V-6505')!.liquidLevel = 99;
    const b = createPhase1Graph();
    expect(b.nodes.get('V-6505')!.pressure).toBe(89);
    expect(b.nodes.get('V-6505')!.liquidLevel).toBe(50);
  });
});
