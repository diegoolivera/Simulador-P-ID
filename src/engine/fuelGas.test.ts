import { describe, expect, it } from 'vitest';
import { createFuelGasGraph } from '../data/phase2';
import { createValve } from './valve';
import type { Valve } from '../types/plant';
import {
  evaluateFuelGasAlarms,
  HH_SCRUBBER_LEVEL,
  LOW_FG_HEADER_PRESSURE,
  NOMINAL_FG_HEADER_PRESSURE,
  stepFuelGas,
} from './fuelGas';

const openPcv = (): Map<string, Valve> => {
  const valve = createValve('PCV-700', 'control', 'FC');
  valve.position = 1;
  valve.targetPosition = 1;
  return new Map([['PCV-700', valve]]);
};

describe('Fuel gas network', () => {
  it('starts at nominal header pressure with supply available', () => {
    const graph = createFuelGasGraph();
    const state = stepFuelGas(graph, openPcv(), 0);
    expect(state.headerPressure).toBeCloseTo(NOMINAL_FG_HEADER_PRESSURE);
    expect(state.fuelGasOk).toBe(true);
    expect(state.flameOk).toBe(true);
  });

  it('drops header pressure and flame fails when supply trips', () => {
    const graph = createFuelGasGraph();
    let state = stepFuelGas(graph, openPcv(), 0, { trip: true });
    for (let i = 0; i < 20; i++) {
      state = stepFuelGas(graph, openPcv(), 1, { trip: true });
    }
    expect(graph.nodes.get('FG-HEADER')!.pressure).toBeLessThan(LOW_FG_HEADER_PRESSURE);
    expect(state.fuelGasOk).toBe(false);
    expect(state.flameOk).toBe(false);
  });

  it('trips on high scrubber level', () => {
    const graph = createFuelGasGraph();
    graph.nodes.get('FG-001')!.liquidLevel = HH_SCRUBBER_LEVEL + 5;
    const state = stepFuelGas(graph, openPcv(), 1);
    expect(state.flameOk).toBe(false);
  });

  it('forceFail from scenario trips fuel gas', () => {
    const graph = createFuelGasGraph();
    const state = stepFuelGas(graph, openPcv(), 10, { forceFail: true });
    expect(state.fuelGasOk).toBe(false);
  });

  it('raises low pressure and scrubber trip alarms', () => {
    const graph = createFuelGasGraph();
    graph.nodes.get('FG-001')!.liquidLevel = HH_SCRUBBER_LEVEL + 5;
    stepFuelGas(graph, openPcv(), 1, { trip: true });
    const alarms = evaluateFuelGasAlarms(graph, { trip: true }, [], 0);
    expect(alarms.some((a) => a.id === 'ZA-FG-001')).toBe(true);
    expect(alarms.some((a) => a.id === 'PSLL-FG')).toBe(true);
  });

  it('fails fuel gas when PCV-700 is closed', () => {
    const graph = createFuelGasGraph();
    const valve = createValve('PCV-700', 'control', 'FC');
    valve.position = 0;
    valve.targetPosition = 0;
    const valves = new Map([['PCV-700', valve]]);
    let state = stepFuelGas(graph, valves, 0);
    for (let i = 0; i < 20; i++) {
      state = stepFuelGas(graph, valves, 1);
    }
    expect(state.fuelGasOk).toBe(false);
    expect(state.flameOk).toBe(false);
  });

  it('clears trip alarm when scrubber level returns to normal', () => {
    const graph = createFuelGasGraph();
    graph.nodes.get('FG-001')!.liquidLevel = HH_SCRUBBER_LEVEL + 5;
    let alarms = evaluateFuelGasAlarms(graph, {}, [], 0);
    expect(alarms.some((a) => a.id === 'ZA-FG-001')).toBe(true);
    graph.nodes.get('FG-001')!.liquidLevel = 0;
    alarms = evaluateFuelGasAlarms(graph, {}, alarms, 1);
    expect(alarms.some((a) => a.id === 'ZA-FG-001')).toBe(false);
  });
});
