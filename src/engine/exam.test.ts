import { beforeEach, describe, expect, it } from 'vitest';
import { useSimulationStore } from '../stores/simulationStore';
import { useScenarioStore } from '../stores/scenarioStore';
import { useEvalStore } from '../stores/evalStore';
import { MAX_DEW_POINT } from './teg';

/**
 * Exam coverage: every assertion below answers one of the nine questions from
 * the three exercise levels. Values are the ones the model actually settles at
 * under `normal-operation` (verified over a 4200 s run).
 */

const run = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) useSimulationStore.getState().tick(1);
};

const boot = (scenarioId = 'normal-operation', warm = 600) => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().reset();
  useEvalStore.getState().startScenario();
  useScenarioStore.getState().loadScenario(scenarioId);
  useSimulationStore.getState().setRunning(true);
  run(warm);
};

const sim = () => useSimulationStore.getState();
const node = (tag: string) => sim().graph.nodes.get(tag)!;
const valve = (tag: string) => sim().valves.get(tag)!;
const loop = (tag: string) => sim().loops.find((l) => l.tag === tag)!;
const fgNode = (tag: string) => sim().fgGraph.nodes.get(tag)!;
const alarmIds = () => sim().activeAlarms.map((a) => a.tag);
const hasAlarm = (tag: string) => alarmIds().includes(tag);

beforeEach(() => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().reset();
  useEvalStore.getState().startScenario();
});

describe('Level 1 — mass balance, pressure profile and level control', () => {
  it('Q1: reports dry gas to sales and liquid to the TKAG tanks at nominal inlet', () => {
    boot();

    // Plant inlet is 3 x 833_333 = 2.5 MM sm3/d; sales gas must match it.
    const sales = node('SALES-GAS').gasFlow;
    expect(sales).toBeGreaterThan(2_400_000);
    expect(sales).toBeLessThan(2_600_000);

    // Liquid keeps moving all the way to the dispatch header.
    const tankLiquid = node('TKAG-41').liquidFlow + node('TKAG-42').liquidFlow;
    expect(tankLiquid).toBeGreaterThan(0);
    expect(node('DISPATCH').liquidFlow).toBeGreaterThan(0);

    // A mass balance only closes if the sources are actually feeding the train.
    expect(node('WELL-1').pressure).toBeGreaterThan(0);
    expect(node('MANIFOLD').gasFlow).toBeGreaterThan(sales * 0.9);
  });

  it('Q2: holds the design pressure profile (V-6505 89, KG-31 inside 45-55, SB-004 downstream)', () => {
    boot();

    const v6505 = node('V-6505').pressure;
    const sb001 = node('SB-001').pressure;
    const sb004 = node('SB-004').pressure;
    const kg31 = node('KG-31').pressure;

    expect(v6505).toBeGreaterThanOrEqual(88);
    expect(v6505).toBeLessThanOrEqual(90);
    expect(kg31).toBeGreaterThan(45);
    expect(kg31).toBeLessThan(55);

    // dP across PV-6505 (scrubber upstream -> SB-004 downstream) and across the
    // SB-001 outlet valves must both be positive, i.e. the profile decays forward.
    expect(sb001 - v6505).toBeGreaterThan(0);
    expect(v6505 - sb004).toBeGreaterThan(3);
    // KG-31 lifts the gas from ~50 to sales pressure, so the discharge side sits
    // well above its suction.
    expect(node('TC-11').pressure).toBeGreaterThan(kg31 + 25);
    expect(node('SALES-GAS').pressure).toBeGreaterThan(kg31);
  });

  it('Q3: LIC-002 drives LV-002 open when ST-002 rises above its 50% setpoint', () => {
    boot();

    const before = loop('LIC-002').output;
    const beforeLevel = node('ST-002').liquidLevel;
    expect(beforeLevel).toBeGreaterThan(45);
    expect(beforeLevel).toBeLessThan(55);

    node('ST-002').liquidLevel = 75;
    run(10);

    const lic = loop('LIC-002');
    expect(lic.processVariable).toBeGreaterThan(lic.setpoint);
    expect(lic.output).toBeGreaterThan(before);
    expect(valve('LV-002').position).toBeGreaterThan(0.9);

    run(20);
    // The valve really moves liquid: level is pulled back down, not just commanded.
    expect(node('ST-002').liquidLevel).toBeLessThan(60);
    expect(node('ST-002').liquidLevel).toBeLessThan(75);
  });
});

describe('Level 2 — PID damping, TEG dew point and blowdown', () => {
  it('Q1: PV-6505 damps a +20% inlet step without oscillating or tripping PAHH-6505', () => {
    boot();
    const startOpening = valve('PV-6505').position;

    useScenarioStore.getState().loadScenario('inlet-step');
    const pressures: number[] = [];
    for (let i = 0; i < 120; i += 1) {
      run(1);
      pressures.push(node('V-6505').pressure);
    }

    // PIC-6505 opens to absorb the extra throughput...
    expect(valve('PV-6505').position).toBeGreaterThan(startOpening + 0.05);
    // ...and the controlled variable never leaves the band around SP 89.
    expect(Math.min(...pressures)).toBeGreaterThanOrEqual(88.9);
    expect(Math.max(...pressures)).toBeLessThanOrEqual(89.2);
    expect(hasAlarm('PAHH-6505')).toBe(false);
    expect(hasAlarm('PAH-6505')).toBe(false);
    expect(useScenarioStore.getState().status).toBe('won');
  });

  it('Q2: cutting glycol circulation pushes the water dew point out of specification', () => {
    boot();
    expect(sim().tegState.dewPoint).toBeLessThanOrEqual(MAX_DEW_POINT);
    expect(sim().tegOk).toBe(true);

    sim().setScenarioOptions({ circulationRate: 0.2 });
    run(120);

    expect(sim().tegState.dewPoint).toBeGreaterThan(MAX_DEW_POINT);
    expect(sim().tegOk).toBe(false);
    expect(hasAlarm('TAHH-TEG-DRY')).toBe(true);
  });

  it('Q3: opening BDV-031B depressurises KG-31 into the flare header', () => {
    boot();

    const before = node('KG-31').pressure;
    expect(before).toBeGreaterThan(45);
    expect(valve('BDV-031B').position).toBe(0);
    expect(node('FLARE-HEADER').pressure).toBeGreaterThan(0);

    expect(sim().commandValve('BDV-031B', 1, 'manual', 'KG-31 blowdown')).toBe(true);

    run(30);
    expect(node('KG-31').pressure).toBeLessThan(before - 30);
    run(30);
    expect(node('KG-31').pressure).toBeLessThan(5);
    expect(valve('BDV-031B').position).toBe(1);
    expect(node('SALES-GAS').gasFlow).toBeLessThan(2_400_000);
  });
});

describe('Level 3 — domino effects (interlock, air failure, service load)', () => {
  it('Q1: SB-001 overpressure fires PAH-001, which trips SDV-026B and starves the fuel-gas skid', () => {
    boot();
    expect(valve('SDV-026B').position).toBe(1);
    expect(fgNode('FG-HEADER').pressure).toBeGreaterThanOrEqual(2);

    // Block the SB-001 outlet: inlet keeps charging the slug catcher.
    expect(sim().commandValve('V-OUT-001', 0, 'manual', 'block SB-001 outlet')).toBe(true);
    expect(sim().commandValve('V-IN-004', 0, 'manual', 'block SB-001 outlet')).toBe(true);

    let tripped = false;
    for (let i = 0; i < 120 && !tripped; i += 1) {
      run(1);
      tripped = hasAlarm('PAH-001');
    }

    expect(tripped).toBe(true);
    expect(node('SB-001').pressure).toBeGreaterThan(96);

    // Cause-and-effect: the interlock closes the skid isolation automatically.
    expect(valve('SDV-026B').targetPosition).toBe(0);
    run(5);
    expect(valve('SDV-026B').position).toBe(0);
    expect(valve('SDV-026B').lastPriority).toBe('interlock');

    // The latch is the whole point of an interlock: while PAH-001 is active the
    // operator must not be able to hand-open the skid isolation.
    expect(sim().commandValve('SDV-026B', 1, 'manual', 'operator override attempt')).toBe(false);
    expect(valve('SDV-026B').targetPosition).toBe(0);
    expect(valve('SDV-026B').position).toBe(0);

    // Domino: no supply -> header and V-700 collapse -> low-pressure alarm.
    run(30);
    expect(fgNode('FG-SUPPLY').gasFlow).toBe(0);
    expect(fgNode('FG-HEADER').pressure).toBeLessThan(2);
    expect(fgNode('V-700').pressure).toBeLessThan(1);
    expect(hasAlarm('PSLL-FG')).toBe(true);

    // And once the cause clears the operator gets the valve back.
    sim().commandValve('V-OUT-001', 1, 'manual', 'restore SB-001 outlet');
    sim().commandValve('V-IN-004', 1, 'manual', 'restore SB-001 outlet');
    run(60);
    expect(valve('SDV-026B').lastPriority).not.toBe('interlock');
    expect(sim().commandValve('SDV-026B', 1, 'manual', 'reset fuel-gas skid')).toBe(true);
    run(10);
    expect(valve('SDV-026B').position).toBe(1);
    expect(fgNode('FG-HEADER').pressure).toBeGreaterThan(2);
  });

  it('Q2: closing SDV-007 fails every actuator safe and freezes the ST-002/ST-003 levels', () => {
    boot();
    const st002 = node('ST-002').liquidLevel;
    const st003 = node('ST-003').liquidLevel;
    const dispatch = node('DISPATCH').liquidFlow;
    expect(dispatch).toBeGreaterThan(0);

    expect(sim().commandValve('SDV-007', 0, 'manual', 'isolate instrument air')).toBe(true);
    run(30);
    expect(sim().instrumentAirOk).toBe(false);

    // Every fail-closed actuator is driven to its safe position...
    expect(valve('PV-6505').targetPosition).toBe(0);
    expect(valve('LV-002').targetPosition).toBe(0);
    expect(valve('LV-003').targetPosition).toBe(0);
    expect(valve('LV-002').lastPriority).toBe('esd');
    // ...while the fail-open blowdown/vent valves open.
    expect(valve('BDV-031B').position).toBe(1);

    run(120);

    // Both the feed and the drain of ST-002/003 fail closed, so the levels hold
    // instead of flooding: liquid can neither enter nor leave.
    expect(Math.abs(node('ST-002').liquidLevel - st002)).toBeLessThan(0.5);
    expect(Math.abs(node('ST-003').liquidLevel - st003)).toBeLessThan(0.5);
    // Nothing reaches the tanks while the chain is dead.
    expect(node('DISPATCH').liquidFlow).toBeLessThan(dispatch);

    // Restoring the air header releases the latch and hands control back to the loops.
    // (The isolation valves themselves stay at their fail-safe position until the
    // operator re-opens them — only the loop-driven valves resume on their own.)
    expect(sim().commandValve('SDV-007', 1, 'manual', 'restore instrument air')).toBe(true);
    run(30);
    expect(sim().instrumentAirOk).toBe(true);
    expect(valve('LV-002').lastPriority).toBe('auto');
    expect(loop('PIC-6505').mode).toBe('AUTO');
    expect(valve('PV-6505').lastPriority).not.toBe('esd');
  });

  it('Q3: extra service load draws more fuel gas and sags the V-700 / header pressure', () => {
    boot();

    const base = {
      load: sim().electricalState.load,
      flow: fgNode('FG-SUPPLY').gasFlow,
      v700: fgNode('V-700').pressure,
      header: fgNode('FG-HEADER').pressure,
    };
    expect(base.flow).toBeGreaterThan(40_000);
    expect(base.v700).toBeGreaterThan(4);

    sim().setScenarioOptions({ extraLoad: 0.5 });
    run(60);

    expect(sim().electricalState.load).toBeGreaterThan(base.load + 0.4);
    expect(fgNode('FG-SUPPLY').gasFlow).toBeGreaterThan(base.flow + 10_000);
    expect(fgNode('V-700').pressure).toBeLessThan(base.v700 - 1);
    expect(fgNode('FG-HEADER').pressure).toBeLessThan(base.header);
    // Both taps are still healthy: the sag is a load effect, not a trip.
    expect(valve('SDV-006A').position).toBe(1);
    expect(valve('SDV-026B').position).toBe(1);
    expect(hasAlarm('PSLL-FG')).toBe(false);
  });
});
