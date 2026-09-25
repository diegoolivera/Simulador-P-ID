import { describe, expect, it, beforeEach } from 'vitest';
import { SCENARIO_CATALOG } from './catalog';
import { useScenarioStore } from '../stores/scenarioStore';
import { useSimulationStore } from '../stores/simulationStore';

beforeEach(() => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().reset();
});

describe('scenarios', () => {
  it('catalog has three scenarios with win/fail rules', () => {
    expect(Object.keys(SCENARIO_CATALOG).length).toBeGreaterThanOrEqual(3);
    for (const s of Object.values(SCENARIO_CATALOG)) {
      expect(s.win.length).toBeGreaterThan(0);
      expect(s.fail).toBeDefined();
    }
  });

  it('normal operation completes on time', () => {
    useScenarioStore.getState().loadScenario('normal-operation');
    const sim = useSimulationStore.getState();
    sim.setRunning(true);
    for (let i = 0; i < 12; i++) sim.tick(1);
    expect(useScenarioStore.getState().status).toBe('won');
  });

  it('slug trigger raises SB-001 level', () => {
    useScenarioStore.getState().loadScenario('slug-response');
    const sim = useSimulationStore.getState();
    sim.setRunning(true);
    for (let i = 0; i < 10; i++) sim.tick(1);
    expect(useSimulationStore.getState().graph.nodes.get('SB-001')?.liquidLevel).toBeGreaterThan(0);
  });
});
