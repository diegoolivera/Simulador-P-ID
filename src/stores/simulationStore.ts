import { create } from 'zustand';
import type { Alarm, AuditEvent, CommandPriority, Loop, Valve } from '../types/plant';
import type { EsdLevel } from '../engine/esd';
import type { LoopMode } from '../types/plant';
import { canResetEsd, checkEsdEscalation } from '../engine/esd';
import { PlantGraph } from '../engine/graph';
import { createPhase1Graph } from '../data/phase1';
import {
  createCoolingWaterGraph,
  createElectricalGraph,
  createFuelGasGraph,
  createInstrumentAirGraph,
} from '../data/phase2';
import { commandValve as applyCommand, createValve, failPositionFromTag, releaseFailSafe, setLock, valveTypeFromTag } from '../engine/valve';
import { createLoop, PHASE1_LOOPS } from '../engine/loops';
import { acknowledgeAlarm, PHASE1_ALARM_RULES, shelveAlarm } from '../engine/alarms';
import { stepPia, evaluatePiaAlarms, isPiaAlarm, type PiaOptions, type PiaState } from '../engine/pia';
import { stepTeg, evaluateTegAlarms, isTegAlarm, type TegOptions, type TegState } from '../engine/teg';
import { createPiaGraph, createTegGraph } from '../data/phase3';
import { stepPhysics, type PhysicsOptions } from '../engine/physics';
import { evaluateInstrumentAirAlarms, isInstrumentAirAlarm, stepInstrumentAir } from '../engine/instrumentAir';
import { evaluateCoolingWaterAlarms, isCoolingWaterAlarm, stepCoolingWater } from '../engine/coolingWater';
import { evaluateFuelGasAlarms, isFuelGasAlarm, stepFuelGas, type FuelGasOptions } from '../engine/fuelGas';
import {
  evaluateElectricalAlarms,
  isElectricalAlarm,
  stepElectrical,
  type ElectricalOptions,
  type ElectricalState,
} from '../engine/electrical';
import { useScenarioStore } from './scenarioStore';
import { useEvalStore } from './evalStore';

type ScenarioOptions = Partial<PhysicsOptions> &
  Partial<PiaOptions> &
  Partial<TegOptions> &
  Partial<ElectricalOptions> &
  Partial<FuelGasOptions>;

type State = {
  graph: PlantGraph;
  iaGraph: PlantGraph;
  cwGraph: PlantGraph;
  fgGraph: PlantGraph;
  elGraph: PlantGraph;
  piaGraph: PlantGraph;
  tegGraph: PlantGraph;
  valves: Map<string, Valve>;
  loops: Loop[];
  activeAlarms: Alarm[];
  esdLevel: EsdLevel;
  instrumentAirOk: boolean;
  coolingWaterOk: boolean;
  fuelGasOk: boolean;
  flameOk: boolean;
  electricalOk: boolean;
  electricalState: ElectricalState;
  piaOk: boolean;
  piaState: PiaState;
  tegOk: boolean;
  tegState: TegState;
  t: number;
  running: boolean;
  scenarioOptions: ScenarioOptions;
  init: () => void;
  commandValve: (tag: string, target: number, priority: CommandPriority, reason: string) => boolean;
  setEsdLevel: (level: EsdLevel) => void;
  resetEsd: (checklistComplete: boolean) => boolean;
  setInstrumentAirOk: (ok: boolean) => void;
  setCoolingWaterOk: (ok: boolean) => void;
  setRunning: (running: boolean) => void;
  setScenarioOptions: (options: ScenarioOptions) => void;
  lockValve: (tag: string, locked: boolean, reason: string) => boolean;
  addValve: (tag: string, type: Valve['type']) => boolean;
  acknowledgeAlarm: (tag: string) => void;
  shelveAlarm: (tag: string, duration: number) => void;
  setLoopMode: (tag: string, mode: LoopMode) => void;
  setLoopSetpoint: (tag: string, setpoint: number) => void;
  tick: (dt: number) => void;
};

// Tags that start the simulation closed (relief/vent/bypass lines and a few
// isolation valves the exam expects shut at startup).
const INITIALLY_CLOSED = /^(BDV|PSV|VT|BYP)/;
const INITIALLY_CLOSED_TAGS = new Set(['SDV-032A', 'SDV-001B', 'XV-004D', 'DR-009']);

const buildValves = (graph: PlantGraph): Map<string, Valve> => {
  const valves = new Map<string, Valve>();
  for (const edge of graph.edges) {
    if (edge.valveTag && !valves.has(edge.valveTag)) {
      const valve = createValve(edge.valveTag, valveTypeFromTag(edge.valveTag), failPositionFromTag(edge.valveTag));
      if (INITIALLY_CLOSED.test(valve.tag) || INITIALLY_CLOSED_TAGS.has(valve.tag)) {
        valve.position = 0;
        valve.targetPosition = 0;
      }
      valves.set(valve.tag, valve);
    }
  }
  return valves;
};

const makeInitial = () => {
  const graph = createPhase1Graph();
  const iaGraph = createInstrumentAirGraph();
  const cwGraph = createCoolingWaterGraph();
  const fgGraph = createFuelGasGraph();
  const elGraph = createElectricalGraph();
  const piaGraph = createPiaGraph();
  const tegGraph = createTegGraph();
  return {
    graph,
    iaGraph,
    cwGraph,
    fgGraph,
    elGraph,
    piaGraph,
    tegGraph,
    valves: (() => {
      const valves = buildValves(graph);
      // Utility-system valves that live outside the main process graph:
      // PCV-700 fuel-gas regulator, SDV-006A plant-outlet take-off,
      // SDV-026B fuel-gas skid isolation (PAH-001 interlock target),
      // SDV-007 instrument-air skid 19/20 isolation.
      for (const [tag, type] of [
        ['PCV-700', 'control'],
        ['SDV-006A', 'sdv'],
        ['SDV-026B', 'sdv'],
        ['SDV-007', 'sdv'],
      ] as const) {
        valves.set(tag, createValve(tag, type, failPositionFromTag(tag)));
      }
      return valves;
    })(),
    loops: PHASE1_LOOPS.map(createLoop),
    activeAlarms: [] as Alarm[],
    esdLevel: 0 as EsdLevel,
    instrumentAirOk: true,
    coolingWaterOk: true,
    fuelGasOk: true,
    flameOk: true,
    electricalOk: true,
    electricalState: stepElectrical(elGraph, 0),
    piaOk: true,
    piaState: stepPia(piaGraph, 0),
    tegOk: true,
    tegState: stepTeg(tegGraph, 0),
    t: 0,
    running: false,
    scenarioOptions: {} as ScenarioOptions,
  };
};

export const useSimulationStore = create<State>()((set, get) => ({
  ...makeInitial(),
  init: () => set(makeInitial()),
  commandValve: (tag, target, priority, reason) => {
    const { valves, t } = get();
    const valve = valves.get(tag);
    if (!valve) return false;
    const audit: AuditEvent[] = [];
    const ok = applyCommand(valve, target, priority, reason, audit, t);
    if (audit.length) useEvalStore.getState().record(audit);
    set({ valves: new Map(valves) });
    return ok;
  },
  setEsdLevel: (level) => set({ esdLevel: level }),
  resetEsd: (checklistComplete) => {
    const { esdLevel, activeAlarms } = get();
    if (!canResetEsd(esdLevel, activeAlarms, checklistComplete)) return false;
    set({ esdLevel: 0 });
    return true;
  },
  setInstrumentAirOk: (ok) => set({ instrumentAirOk: ok }),
  setCoolingWaterOk: (ok) => set({ coolingWaterOk: ok }),
  setRunning: (running) => set({ running }),
  setScenarioOptions: (options) => set({ scenarioOptions: options }),
  lockValve: (tag, locked, reason) => {
    const { valves, t } = get();
    const valve = valves.get(tag);
    if (!valve) return false;
    const wasLocked = valve.locked;
    setLock(valve, locked);
    const audit: AuditEvent[] = [{ t, source: 'operator', tag, field: 'locked', from: wasLocked ? 'locked' : 'unlocked', to: locked ? 'locked' : 'unlocked', reason }];
    if (audit.length) useEvalStore.getState().record(audit);
    set({ valves: new Map(valves) });
    return true;
  },
  addValve: (tag, type) => {
    const { valves, t } = get();
    if (valves.has(tag)) return false;
    const valve = createValve(tag, type, failPositionFromTag(tag));
    valves.set(tag, valve);
    const audit: AuditEvent[] = [{ t, source: 'operator', tag, field: 'created', from: '', to: type, reason: 'Added from P&ID editor' }];
    if (audit.length) useEvalStore.getState().record(audit);
    set({ valves: new Map(valves) });
    return true;
  },
  acknowledgeAlarm: (tag) => {
    const { activeAlarms } = get();
    const alarm = activeAlarms.find((a) => a.tag === tag);
    if (!alarm) return;
    acknowledgeAlarm(alarm);
    set({ activeAlarms: [...activeAlarms] });
  },
  shelveAlarm: (tag, duration) => {
    const { activeAlarms, t } = get();
    const alarm = activeAlarms.find((a) => a.tag === tag);
    if (!alarm) return;
    shelveAlarm(alarm, t, duration);
    set({ activeAlarms: [...activeAlarms] });
  },
  setLoopMode: (tag, mode) => {
    const { loops } = get();
    const loop = loops.find((l) => l.tag === tag);
    if (!loop) return;
    loop.mode = mode;
    set({ loops: [...loops] });
  },
  setLoopSetpoint: (tag, setpoint) => {
    const { loops } = get();
    const loop = loops.find((l) => l.tag === tag);
    if (!loop) return;
    loop.setpoint = setpoint;
    set({ loops: [...loops] });
  },
  tick: (dt) => {
    const state = get();
    if (!state.running) return;
    const scenario = useScenarioStore.getState();
    scenario.step(dt);
    const opts = scenario.getPhysicsOptions();

    // SDV-007 is the instrument-air isolation from skids 19/20: closing it is
    // equivalent to losing the air header, so every actuator fails safe.
    const sdv007 = state.valves.get('SDV-007');
    const airLost = opts.instrumentAirOk === false || (sdv007 ? sdv007.position <= 0.05 : false);
    const iaOptions = {
      ...(opts.instrumentAirOptions ?? state.scenarioOptions.instrumentAirOptions),
      forceFail: airLost,
    };
    const { instrumentAirOk } = stepInstrumentAir(state.iaGraph, dt, iaOptions);

    const cwOptions = {
      ...(opts.coolingWaterOptions ?? state.scenarioOptions.coolingWaterOptions),
      forceFail: opts.coolingWaterOk === false,
    };
    const { coolingWaterOk } = stepCoolingWater(state.cwGraph, dt, cwOptions);

    const pcv700 = state.valves.get('PCV-700');
    const elOptions = {
      ...(opts.electricalOptions ?? state.scenarioOptions.electricalOptions),
      forceFail: opts.electricalOk === false,
      extraLoad: state.scenarioOptions.extraLoad ?? opts.electricalOptions?.extraLoad ?? 0,
    };
    const electricalState = stepElectrical(state.elGraph, dt, elOptions, state.electricalState);
    const electricalOk = electricalState.electricalOk;

    const fgOptions = {
      ...(opts.fuelGasOptions ?? state.scenarioOptions.fuelGasOptions),
      forceFail: opts.fuelGasOk === false,
      supplyAvailable: pcv700 ? pcv700.position > 0.05 : true,
      // Fuel-gas demand follows the generator load: extra service load burns more
      // gas out of the plant outlet and sags the V-700 / header pressure.
      load: electricalState.load,
    };
    const { fuelGasOk, flameOk } = stepFuelGas(state.fgGraph, state.valves, dt, fgOptions);

    const piaOptions: PiaOptions = {
      ...(state.scenarioOptions as Partial<PiaOptions>),
    };
    const piaState = stepPia(state.piaGraph, dt, piaOptions);
    const piaOk = piaState.piaOk;

    const tegOptions: TegOptions = {
      ...(state.scenarioOptions as Partial<TegOptions>),
    };
    const tegState = stepTeg(state.tegGraph, dt, tegOptions);
    const tegOk = tegState.tegOk;

    const preUtilityAlarms = state.activeAlarms.filter(
      (a) =>
        !isInstrumentAirAlarm(a) &&
        !isCoolingWaterAlarm(a) &&
        !isFuelGasAlarm(a) &&
        !isElectricalAlarm(a) &&
        !isPiaAlarm(a) &&
        !isTegAlarm(a)
    );
    const prevIaAlarms = state.activeAlarms.filter(isInstrumentAirAlarm);
    const prevCwAlarms = state.activeAlarms.filter(isCoolingWaterAlarm);
    const prevFgAlarms = state.activeAlarms.filter(isFuelGasAlarm);
    const prevElAlarms = state.activeAlarms.filter(isElectricalAlarm);
    const prevPiaAlarms = state.activeAlarms.filter(isPiaAlarm);
    const prevTegAlarms = state.activeAlarms.filter(isTegAlarm);
    const iaAlarms = evaluateInstrumentAirAlarms(state.iaGraph, iaOptions, prevIaAlarms, state.t);
    const cwAlarms = evaluateCoolingWaterAlarms(state.cwGraph, cwOptions, prevCwAlarms, state.t);
    const fgAlarms = evaluateFuelGasAlarms(state.fgGraph, fgOptions, prevFgAlarms, state.t);
    const elAlarms = evaluateElectricalAlarms(state.elGraph, elOptions, electricalState, prevElAlarms, state.t);
    const piaAlarms = evaluatePiaAlarms(state.piaGraph, piaOptions, prevPiaAlarms, state.t);
    const tegAlarms = evaluateTegAlarms(state.tegGraph, tegOptions, prevTegAlarms, state.t);

    const options: PhysicsOptions = {
      // Scenario base/trigger options first, then explicit operator overrides:
      // InputControls must win over the scenario defaults or the sliders are dead.
      ...opts,
      ...state.scenarioOptions,
      t: state.t,
      loops: state.loops,
      alarmRules: PHASE1_ALARM_RULES,
      activeAlarms: preUtilityAlarms,
      esdLevel: Math.max(state.esdLevel, (opts.esdLevel ?? 0) as EsdLevel),
      instrumentAirOk,
      coolingWaterOk,
      fuelGasOk,
      fuelGasOptions: fgOptions,
      electricalOk,
      electricalOptions: elOptions,
    };
    const audit = stepPhysics(state.graph, state.valves, dt, options);
    if (audit.length) useEvalStore.getState().record(audit);
    const newEsd = (checkEsdEscalation(state.graph) ?? options.esdLevel ?? state.esdLevel) as EsdLevel;
    // Fail-safe commands (air loss, ESD) latch lastPriority at 'esd', which permanently
    // blocks every lower-priority loop/operator command. Release the latch once both
    // causes are gone so control resumes instead of staying dead forever. Gated on the
    // header itself (not SDV-007 position) so actuators stay failed until air returns.
    if (instrumentAirOk && newEsd === 0) releaseFailSafe(state.valves);
    const activeAlarms = [...(options.activeAlarms ?? []), ...iaAlarms, ...cwAlarms, ...fgAlarms, ...elAlarms, ...piaAlarms, ...tegAlarms];
    scenario.checkEndConditions(state.graph, activeAlarms, newEsd);
    set({
      t: state.t + dt,
      valves: new Map(state.valves),
      loops: [...state.loops],
      activeAlarms,
      esdLevel: newEsd,
      instrumentAirOk,
      coolingWaterOk,
      fuelGasOk,
      flameOk,
      electricalOk,
      electricalState,
      piaOk,
      piaState,
      tegOk,
      tegState,
      iaGraph: state.iaGraph,
      cwGraph: state.cwGraph,
      fgGraph: state.fgGraph,
      elGraph: state.elGraph,
      piaGraph: state.piaGraph,
      tegGraph: state.tegGraph,
    });
  },
}));
