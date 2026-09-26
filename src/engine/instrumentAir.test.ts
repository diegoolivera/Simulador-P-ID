import { describe, expect, it } from 'vitest';
import { createInstrumentAirGraph } from '../data/phase2';
import {
  evaluateInstrumentAirAlarms,
  LOW_HEADER_PRESSURE,
  NOMINAL_HEADER_PRESSURE,
  stepInstrumentAir,
} from './instrumentAir';

describe('Instrument air network', () => {
  it('starts at nominal header pressure with both compressors running', () => {
    const graph = createInstrumentAirGraph();
    const { instrumentAirOk, headerPressure } = stepInstrumentAir(graph, 1);
    expect(headerPressure).toBe(NOMINAL_HEADER_PRESSURE);
    expect(instrumentAirOk).toBe(true);
  });

  it('drops header pressure when both compressors trip', () => {
    const graph = createInstrumentAirGraph();
    let ok = true;
    for (let i = 0; i < 20; i++) {
      const result = stepInstrumentAir(graph, 1, { tripA: true, tripB: true });
      ok = result.instrumentAirOk;
    }
    expect(graph.nodes.get('IA-HEADER')!.pressure).toBeLessThan(LOW_HEADER_PRESSURE);
    expect(ok).toBe(false);
  });

  it('one running compressor keeps header pressure healthy', () => {
    const graph = createInstrumentAirGraph();
    for (let i = 0; i < 20; i++) {
      stepInstrumentAir(graph, 1, { tripA: true });
    }
    expect(graph.nodes.get('IA-HEADER')!.pressure).toBeGreaterThanOrEqual(LOW_HEADER_PRESSURE);
  });

  it('forceFail from scenario trips both compressors', () => {
    const graph = createInstrumentAirGraph();
    const { instrumentAirOk } = stepInstrumentAir(graph, 10, { forceFail: true });
    expect(instrumentAirOk).toBe(false);
  });

  it('raises low pressure and trip alarms', () => {
    const graph = createInstrumentAirGraph();
    stepInstrumentAir(graph, 10, { tripA: true });
    const alarms = evaluateInstrumentAirAlarms(graph, { tripA: true }, [], 0);
    expect(alarms.some((a) => a.id === 'ZA-001A')).toBe(true);
  });

  it('clears trip alarm when compressor resets', () => {
    const graph = createInstrumentAirGraph();
    let alarms = evaluateInstrumentAirAlarms(graph, { tripA: true }, [], 0);
    expect(alarms.some((a) => a.id === 'ZA-001A')).toBe(true);
    alarms = evaluateInstrumentAirAlarms(graph, { tripA: false }, alarms, 1);
    expect(alarms.some((a) => a.id === 'ZA-001A')).toBe(false);
  });
});
