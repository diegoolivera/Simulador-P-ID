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

  it('starts SDV-OUT-004 open and commandable on the SB-004 outlet', () => {
    const sim = useSimulationStore.getState();
    const valve = sim.valves.get('SDV-OUT-004');
    expect(valve).toBeDefined();
    // It is the first block valve in series on the scrubber's only outlet, so it
    // must start open or the plant is dead-ended.
    expect(valve!.position).toBe(1);
    expect(valve!.targetPosition).toBe(1);

    expect(sim.commandValve('SDV-OUT-004', 0, 'manual', 'isolation test')).toBe(true);
    expect(useSimulationStore.getState().valves.get('SDV-OUT-004')!.targetPosition).toBe(0);
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

  it('operator boundary overrides win over the scenario defaults', () => {
    const sim = useSimulationStore.getState();
    expect(useScenarioStore.getState().loadScenario('normal-operation')).toBe(true);
    sim.setScenarioOptions({ sourcePressure: 40, sourceFlow: 400_000 });
    sim.setRunning(true);
    sim.tick(1);
    const well = useSimulationStore.getState().graph.nodes.get('WELL-1')!;
    // Scenario base says 95 kg/cm2; without the override the slider would be dead.
    expect(well.pressure).toBe(40);
    expect(useScenarioStore.getState().getPhysicsOptions().sourcePressure).toBe(95);
  });

  it('esd-fire does not fail on the pre-trigger ticks', () => {
    expect(useScenarioStore.getState().loadScenario('esd-fire')).toBe(true);
    const graph = useSimulationStore.getState().graph;

    // Fail used to be `esd > 0`, evaluated as `esd >= 0`: true even at level 0,
    // and fail is checked before win, so the scenario went to 'lost' on tick 1 -
    // before its own trigger at t=2 ever fired. It is a plain timeout now.
    useScenarioStore.getState().step(1);
    expect(useScenarioStore.getState().checkEndConditions(graph, [], 0)).toBeNull();
    expect(useScenarioStore.getState().status).toBe('running');
  });

  it('esd-fire waits for a reset while the ESD is active', () => {
    expect(useScenarioStore.getState().loadScenario('esd-fire')).toBe(true);
    const graph = useSimulationStore.getState().graph;
    useScenarioStore.getState().step(21); // trigger at t=2 has fired

    // Past the 20 s win threshold but the ESD is still on: neither won nor lost.
    expect(useScenarioStore.getState().checkEndConditions(graph, [], 1)).toBeNull();
    expect(useScenarioStore.getState().status).toBe('running');

    // Clearing it completes the win condition.
    expect(useScenarioStore.getState().checkEndConditions(graph, [], 0)).toBe('won');
  });

  it('esd-fire loses on timeout when the ESD is never cleared', () => {
    expect(useScenarioStore.getState().loadScenario('esd-fire')).toBe(true);
    const graph = useSimulationStore.getState().graph;
    useScenarioStore.getState().step(60);
    expect(useScenarioStore.getState().checkEndConditions(graph, [], 1)).toBe('lost');
  });

  it('the ESD level is a one-tick impulse, so resetEsd survives the next tick', () => {
    expect(useScenarioStore.getState().loadScenario('esd-fire')).toBe(true);
    useSimulationStore.getState().setRunning(true);
    for (let i = 0; i < 6; i++) useSimulationStore.getState().tick(1); // trigger at t=2
    expect(useSimulationStore.getState().esdLevel).toBe(1);

    expect(useSimulationStore.getState().resetEsd(true)).toBe(true);
    expect(useSimulationStore.getState().esdLevel).toBe(0);

    // `esdLevel` used to stay in scenario currentOptions, so tick's
    // `Math.max(state.esdLevel, opts.esdLevel ?? 0)` put level 1 back here.
    useSimulationStore.getState().tick(1);
    expect(useSimulationStore.getState().esdLevel).toBe(0);
    expect(useScenarioStore.getState().status).toBe('running');
  });
});
