import { describe, expect, it, beforeEach } from 'vitest';
import { useSimulationStore } from './simulationStore';
import { useScenarioStore } from './scenarioStore';
import { useEvalStore } from './evalStore';
import { useUiStore } from './uiStore';

beforeEach(() => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().reset();
  useEvalStore.getState().startScenario();
  useUiStore.setState({ view: 'scada', selectedTag: null, dialog: null, theme: 'light', tooltip: null });
});

describe('stores', () => {
  it('simulation store initialises and ticks', () => {
    const sim = useSimulationStore.getState();
    expect(sim.graph.nodes.has('SB-001')).toBe(true);
    sim.commandValve('V-IN-009', 0, 'manual', 'test');
    expect(useSimulationStore.getState().valves.get('V-IN-009')?.targetPosition).toBe(0);
    expect(useEvalStore.getState().audit.length).toBe(1);
    sim.setRunning(true);
    for (let i = 0; i < 5; i++) sim.tick(1);
    expect(useSimulationStore.getState().graph.nodes.get('SB-001')?.pressure).toBeGreaterThan(0);
  });

  it('simulation store applies ESD and resets safely', () => {
    const sim = useSimulationStore.getState();
    sim.setEsdLevel(1);
    expect(useSimulationStore.getState().esdLevel).toBe(1);
    expect(sim.resetEsd(true)).toBe(true);
    expect(useSimulationStore.getState().esdLevel).toBe(0);
  });

  it('scenario store loads and fires triggers', () => {
    const sc = useScenarioStore.getState();
    expect(sc.loadScenario('slug-response')).toBe(true);
    expect(useScenarioStore.getState().activeId).toBe('slug-response');
    sc.step(6);
    expect(useScenarioStore.getState().getPhysicsOptions().slug).toBeDefined();
  });

  it('eval store records and scores', () => {
    const ev = useEvalStore.getState();
    ev.record([{ t: 0, source: 'operator', tag: 'XV-001', field: 'targetPosition', from: 1, to: 0 }]);
    expect(useEvalStore.getState().audit.length).toBe(1);
    ev.addResult({ id: 'R1', severity: 'CRITICAL', message: 'unsafe' });
    expect(ev.computeScore().max).toBe(60);
  });

  it('ui store tracks selections and dialogs', () => {
    const ui = useUiStore.getState();
    ui.selectTag('SB-001');
    expect(useUiStore.getState().selectedTag).toBe('SB-001');
    ui.openDialog('esd');
    expect(useUiStore.getState().dialog).toBe('esd');
  });
});
