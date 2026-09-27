import { describe, expect, it } from 'vitest';
import { createElectricalGraph } from '../data/phase2';
import {
  evaluateElectricalAlarms,
  NOMINAL_BUS_VOLTAGE,
  NOMINAL_FREQUENCY,
  OVER_FREQUENCY,
  stepElectrical,
  UNDER_FREQUENCY,
  UNDER_VOLTAGE,
} from './electrical';

describe('Electrical one-line', () => {
  it('starts at nominal frequency and voltage with generator running', () => {
    const graph = createElectricalGraph();
    const state = stepElectrical(graph, 1);
    expect(state.frequency).toBeCloseTo(NOMINAL_FREQUENCY);
    expect(state.busVoltage).toBeCloseTo(NOMINAL_BUS_VOLTAGE);
    expect(state.electricalOk).toBe(true);
  });

  it('frequency and voltage collapse when the generator trips', () => {
    const graph = createElectricalGraph();
    let state = stepElectrical(graph, 0, { generatorTrip: true });
    for (let i = 0; i < 10; i++) {
      state = stepElectrical(graph, 1, { generatorTrip: true });
    }
    expect(state.frequency).toBeLessThan(UNDER_FREQUENCY);
    expect(state.busVoltage).toBeLessThan(UNDER_VOLTAGE);
    expect(state.electricalOk).toBe(false);
  });

  it('sheds process load on undervoltage while keeping essential load', () => {
    const graph = createElectricalGraph();
    const state = stepElectrical(graph, 10, { generatorTrip: true });
    expect(state.breakers['BRK-PROC']).toBe(false);
    expect(state.breakers['BRK-ESS']).toBe(true);
  });

  it('trips generator breaker on under-frequency', () => {
    const graph = createElectricalGraph();
    const state = stepElectrical(
      graph,
      10,
      { generatorRunning: false },
      { frequency: 50, busVoltage: 0.83, electricalOk: false, breakers: { 'BRK-GEN': true, 'BRK-MCC': true, 'BRK-PROC': true, 'BRK-ESS': true }, load: 0.9 }
    );
    expect(state.breakers['BRK-GEN']).toBe(false);
  });

  it('raises under-voltage, under-frequency and generator trip alarms', () => {
    const graph = createElectricalGraph();
    const state = stepElectrical(graph, 10, { generatorTrip: true });
    const alarms = evaluateElectricalAlarms(graph, { generatorTrip: true }, state, [], 0);
    expect(alarms.some((a) => a.id === 'VOLT-LO-BUS')).toBe(true);
    expect(alarms.some((a) => a.id === 'UF-BUS')).toBe(true);
    expect(alarms.some((a) => a.id === 'ZA-GEN-001')).toBe(true);
  });

  it('clears alarms when the generator returns to service', () => {
    const graph = createElectricalGraph();
    let state = stepElectrical(graph, 10, { generatorTrip: true });
    let alarms = evaluateElectricalAlarms(graph, { generatorTrip: true }, state, [], 0);
    expect(alarms.length).toBeGreaterThan(0);
    state = stepElectrical(graph, 10, { generatorTrip: false, breakers: { 'BRK-GEN': true, 'BRK-MCC': true, 'BRK-PROC': true, 'BRK-ESS': true } });
    alarms = evaluateElectricalAlarms(graph, { generatorTrip: false }, state, alarms, 1);
    expect(alarms.length).toBe(0);
  });

  it('raises over-frequency alarm on generator overspeed', () => {
    const graph = createElectricalGraph();
    const state = {
      frequency: OVER_FREQUENCY + 1,
      busVoltage: NOMINAL_BUS_VOLTAGE,
      electricalOk: true,
      breakers: { 'BRK-GEN': true, 'BRK-MCC': true, 'BRK-PROC': true, 'BRK-ESS': true },
      load: 1.1,
    };
    const alarms = evaluateElectricalAlarms(graph, {}, state, [], 0);
    expect(alarms.some((a) => a.id === 'OF-BUS')).toBe(true);
  });
});
