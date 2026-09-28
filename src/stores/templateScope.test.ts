import { describe, expect, it } from 'vitest';
import type { Alarm } from '../types/plant';
import { PLANT_SYSTEMS, TEMPLATES } from '../data/templates';
import { isCoolingWaterAlarm } from '../engine/coolingWater';
import { isElectricalAlarm } from '../engine/electrical';
import { isFuelGasAlarm } from '../engine/fuelGas';
import { isInstrumentAirAlarm } from '../engine/instrumentAir';
import { isPiaAlarm } from '../engine/pia';
import { isTegAlarm } from '../engine/teg';
import { useSimulationStore } from './simulationStore';
import { useScenarioStore } from './scenarioStore';
import { useEvalStore } from './evalStore';
import { useUiStore } from './uiStore';

type TemplateId = 'basic' | 'medium' | 'complex';

const UTILITY_PREDICATES: ((alarm: Alarm) => boolean)[] = [
  isInstrumentAirAlarm,
  isCoolingWaterAlarm,
  isFuelGasAlarm,
  isElectricalAlarm,
  isPiaAlarm,
  isTegAlarm,
];

const isUtilityAlarm = (alarm: Alarm) => UTILITY_PREDICATES.some((predicate) => predicate(alarm));
const alarmIds = () => useSimulationStore.getState().activeAlarms.map((a) => a.id);

const run = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) useSimulationStore.getState().tick(1);
};

const boot = (template: TemplateId, warm = 600) => {
  useUiStore.setState({ template });
  useSimulationStore.getState().init();
  useScenarioStore.getState().reset();
  useEvalStore.getState().startScenario();
  useScenarioStore.getState().loadScenario('normal-operation');
  useSimulationStore.getState().setRunning(true);
  run(warm);
};

describe('template scoping', () => {
  it('every template declares a non-empty set of known systems including process', () => {
    for (const template of Object.values(TEMPLATES)) {
      expect(template.systems.length).toBeGreaterThan(0);
      expect(template.systems).toContain('process');
      expect(new Set(template.systems).size).toBe(template.systems.length);
      for (const system of template.systems) {
        expect(PLANT_SYSTEMS).toContain(system);
      }
    }
    expect(TEMPLATES.basic.systems).toEqual(['process']);
    expect(TEMPLATES.complex.systems).toEqual(PLANT_SYSTEMS);
  });

  it('basic: runs a long stretch with no utility alarms and settles the process train', () => {
    boot('basic', 0);

    let utilityAlarmSeen = false;
    for (let i = 0; i < 700 && !utilityAlarmSeen; i += 1) {
      useSimulationStore.getState().tick(1);
      utilityAlarmSeen = useSimulationStore.getState().activeAlarms.some(isUtilityAlarm);
    }
    expect(utilityAlarmSeen).toBe(false);
    expect(useSimulationStore.getState().activeAlarms.filter(isUtilityAlarm)).toEqual([]);

    // The process train must still settle where the exam expects it to: an
    // inactive utility may never be treated as failed.
    const sim = useSimulationStore.getState();
    const sales = sim.graph.nodes.get('SALES-GAS')!.gasFlow;
    expect(sales).toBeGreaterThan(2_400_000);
    expect(sales).toBeLessThan(2_600_000);
    const v6505 = sim.graph.nodes.get('V-6505')!.pressure;
    expect(v6505).toBeGreaterThanOrEqual(88);
    expect(v6505).toBeLessThanOrEqual(90);
    expect(sim.instrumentAirOk).toBe(true);
    expect(sim.activeSystems).toEqual(['process']);
  });

  it('complex: utilities are stepped and their alarms can appear', () => {
    boot('complex', 60);
    expect(useSimulationStore.getState().activeSystems).toContain('electrical');
    expect(useSimulationStore.getState().activeSystems).toContain('teg');

    // Electrical load only responds to service load because the system is stepped.
    const baseLoad = useSimulationStore.getState().electricalState.load;
    useSimulationStore.getState().setScenarioOptions({ extraLoad: 0.5 });
    run(60);
    expect(useSimulationStore.getState().electricalState.load).toBeGreaterThan(baseLoad + 0.4);

    // A real air-header loss raises the representative instrument-air alarm.
    useSimulationStore.getState().commandValve('SDV-007', 0, 'manual', 'test air loss');
    run(30);
    expect(alarmIds()).toContain('PSLL-IA');
  });

  it('medium: instrument air and fuel gas run while PIA and TEG stay absent', () => {
    boot('medium', 60);
    expect(useSimulationStore.getState().activeSystems).toEqual([
      'process',
      'instrumentAir',
      'coolingWater',
      'fuelGas',
      'electrical',
    ]);

    // A TEG fault and a PIA pump trip are requested, but those systems are not
    // part of this template, so neither may raise an alarm.
    useSimulationStore.getState().setScenarioOptions({ circulationRate: 0.2, tripA: true });
    run(120);
    expect(alarmIds()).not.toContain('TAHH-TEG-DRY');
    expect(useSimulationStore.getState().activeAlarms.filter(isPiaAlarm)).toEqual([]);

    // Instrument air is active: losing its header does raise PSLL-IA.
    useSimulationStore.getState().commandValve('SDV-007', 0, 'manual', 'test air loss');
    run(30);
    expect(alarmIds()).toContain('PSLL-IA');
  });

  it('switching to a template without a system drops its alarms and resets its graph', () => {
    boot('complex', 60);
    useSimulationStore.getState().commandValve('SDV-007', 0, 'manual', 'trip air');
    run(30);
    expect(alarmIds()).toContain('PSLL-IA');

    useUiStore.setState({ template: 'basic' });
    run(1);
    const sim = useSimulationStore.getState();
    expect(sim.activeSystems).toEqual(['process']);
    expect(alarmIds()).not.toContain('PSLL-IA');
    // Deactivating a system discards its live state: the graph is rebuilt from
    // the healthy baseline so the failure cannot resurface on re-enable.
    expect(sim.iaGraph.nodes.get('IA-HEADER')!.pressure).toBeGreaterThan(5.5);
    expect(sim.instrumentAirOk).toBe(true);
  });
});
