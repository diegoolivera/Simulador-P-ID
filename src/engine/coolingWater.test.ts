import { describe, expect, it } from 'vitest';
import { createCoolingWaterGraph } from '../data/phase2';
import {
  evaluateCoolingWaterAlarms,
  LOW_CW_HEADER_PRESSURE,
  NOMINAL_CW_HEADER_PRESSURE,
  stepCoolingWater,
} from './coolingWater';

describe('Cooling water network', () => {
  it('starts at nominal header pressure with both pumps running', () => {
    const graph = createCoolingWaterGraph();
    const state = stepCoolingWater(graph, 1);
    expect(state.headerPressure).toBeCloseTo(NOMINAL_CW_HEADER_PRESSURE);
    expect(state.coolingWaterOk).toBe(true);
  });

  it('drops header pressure when both pumps trip', () => {
    const graph = createCoolingWaterGraph();
    let ok = true;
    for (let i = 0; i < 20; i++) {
      const state = stepCoolingWater(graph, 1, { tripA: true, tripB: true });
      ok = state.coolingWaterOk;
    }
    expect(graph.nodes.get('CW-HEADER')!.pressure).toBeLessThan(LOW_CW_HEADER_PRESSURE);
    expect(ok).toBe(false);
  });

  it('one running pump keeps header pressure healthy', () => {
    const graph = createCoolingWaterGraph();
    for (let i = 0; i < 20; i++) {
      stepCoolingWater(graph, 1, { tripA: true });
    }
    expect(graph.nodes.get('CW-HEADER')!.pressure).toBeGreaterThanOrEqual(LOW_CW_HEADER_PRESSURE);
  });

  it('forceFail from scenario trips both pumps', () => {
    const graph = createCoolingWaterGraph();
    const state = stepCoolingWater(graph, 10, { forceFail: true });
    expect(state.coolingWaterOk).toBe(false);
  });

  it('raises low pressure and pump trip alarms', () => {
    const graph = createCoolingWaterGraph();
    stepCoolingWater(graph, 10, { tripA: true, tripB: true });
    const alarms = evaluateCoolingWaterAlarms(graph, { tripA: true, tripB: true }, [], 0);
    expect(alarms.some((a) => a.id === 'ZA-CW-A')).toBe(true);
    expect(alarms.some((a) => a.id === 'PSLL-CW')).toBe(true);
  });

  it('clears trip alarm when pump resets', () => {
    const graph = createCoolingWaterGraph();
    let alarms = evaluateCoolingWaterAlarms(graph, { tripA: true }, [], 0);
    expect(alarms.some((a) => a.id === 'ZA-CW-A')).toBe(true);
    alarms = evaluateCoolingWaterAlarms(graph, { tripA: false }, alarms, 1);
    expect(alarms.some((a) => a.id === 'ZA-CW-A')).toBe(false);
  });
});
