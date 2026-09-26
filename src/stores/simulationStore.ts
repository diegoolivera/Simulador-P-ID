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
import { commandValve as applyCommand, createValve, failPositionFromTag, setLock, valveTypeFromTag } from '../engine/valve';
import { createLoop, PHASE1_LOOPS } from '../engine/loops';
import { acknowledgeAlarm, PHASE1_ALARM_RULES, shelveAlarm } from '../engine/alarms';
import { stepPhysics, type PhysicsOptions } from '../engine/physics';
import { evaluateInstrumentAirAlarms, isInstrumentAirAlarm, stepInstrumentAir } from '../engine/instrumentAir';
import { evaluateCoolingWaterAlarms, isCoolingWaterAlarm, stepCoolingWater } from '../engine/coolingWater';
import { evaluateFuelGasAlarms, isFuelGasAlarm, stepFuelGas } from '../engine/fuelGas';
import {
  evaluateElectricalAlarms,
  isElectricalAlarm,
  stepElectrical,
  type ElectricalState,
} from '../engine/electrical';
import { useScenarioStore } from './scenarioStore';
import { useEvalStore } from './evalStore';

type State = {
  graph: PlantGraph;
  iaGraph: PlantGraph;
  cwGraph: PlantGraph;
  fgGraph: PlantGraph;
  elGraph: PlantGraph;
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
  t: number;
  running: boolean;
  scenarioOptions: Partial<PhysicsOptions>;
  init: () => void;
  commandValve: (tag: string, target: number, priority: CommandPriority, reason: string) => boolean;
  setEsdLevel: (level: EsdLevel) => void;
  resetEsd: (checklistComplete: boolean) => boolean;
  setInstrumentAirOk: (ok: boolean) => void;
  setCoolingWaterOk: (ok: boolean) => void;
  setRunning: (running: boolean) => void;
  setScenarioOptions: (options: Partial<PhysicsOptions>) => void;
  lockValve: (tag: string, locked: boolean, reason: string) => boolean;
  acknowledgeAlarm: (tag: string) => void;
  shelveAlarm: (tag: string, duration: number) => void;
  setLoopMode: (tag: string, mode: LoopMode) => void;
  setLoopSetpoint: (tag: string, setpoint: number) => void;
  tick: (dt: number) => void;
};

const buildValves = (graph: PlantGraph): Map<string, Valve> => {
  const valves = new Map<string, Valve>();
  for (const edge of graph.edges) {
    if (edge.valveTag && !valves.has(edge.valveTag)) {
      valves.set(edge.valveTag, createValve(edge.valveTag, valveTypeFromTag(edge.valveTag), failPositionFromTag(edge.valveTag)));
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
  return {
    graph,
    iaGraph,
    cwGraph,
    fgGraph,
    elGraph,
    valves: buildValves(graph),
    loops: PHASE1_LOOPS.map(createLoop),
    activeAlarms: [] as Alarm[],
    esdLevel: 0 as EsdLevel,
    instrumentAirOk: true,
    coolingWaterOk: true,
    fuelGasOk: true,
    flameOk: true,
    electricalOk: true,
    electricalState: stepElectrical(elGraph, 0),
    t: 0,
    running: false,
    scenarioOptions: {} as Partial<PhysicsOptions>,
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

    const iaOptions = {
      ...(opts.instrumentAirOptions ?? state.scenarioOptions.instrumentAirOptions),
      forceFail: opts.instrumentAirOk === false,
    };
    const { instrumentAirOk } = stepInstrumentAir(state.iaGraph, dt, iaOptions);

    const cwOptions = {
      ...(opts.coolingWaterOptions ?? state.scenarioOptions.coolingWaterOptions),
      forceFail: opts.coolingWaterOk === false,
    };
    const { coolingWaterOk } = stepCoolingWater(state.cwGraph, dt, cwOptions);

    const fgOptions = {
      ...(opts.fuelGasOptions ?? state.scenarioOptions.fuelGasOptions),
      forceFail: opts.fuelGasOk === false,
    };
    const { fuelGasOk, flameOk } = stepFuelGas(state.fgGraph, dt, fgOptions);

    const elOptions = {
      ...(opts.electricalOptions ?? state.scenarioOptions.electricalOptions),
      forceFail: opts.electricalOk === false,
    };
    const electricalState = stepElectrical(state.elGraph, dt, elOptions, state.electricalState);
    const electricalOk = electricalState.electricalOk;

    const preUtilityAlarms = state.activeAlarms.filter(
      (a) =>
        !isInstrumentAirAlarm(a) &&
        !isCoolingWaterAlarm(a) &&
        !isFuelGasAlarm(a) &&
        !isElectricalAlarm(a)
    );
    const prevIaAlarms = state.activeAlarms.filter(isInstrumentAirAlarm);
    const prevCwAlarms = state.activeAlarms.filter(isCoolingWaterAlarm);
    const prevFgAlarms = state.activeAlarms.filter(isFuelGasAlarm);
    const prevElAlarms = state.activeAlarms.filter(isElectricalAlarm);
    const iaAlarms = evaluateInstrumentAirAlarms(state.iaGraph, iaOptions, prevIaAlarms, state.t);
    const cwAlarms = evaluateCoolingWaterAlarms(state.cwGraph, cwOptions, prevCwAlarms, state.t);
    const fgAlarms = evaluateFuelGasAlarms(state.fgGraph, fgOptions, prevFgAlarms, state.t);
    const elAlarms = evaluateElectricalAlarms(state.elGraph, elOptions, electricalState, prevElAlarms, state.t);

    const options: PhysicsOptions = {
      ...state.scenarioOptions,
      ...opts,
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
    const activeAlarms = [...(options.activeAlarms ?? []), ...iaAlarms, ...cwAlarms, ...fgAlarms, ...elAlarms];
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
      iaGraph: state.iaGraph,
      cwGraph: state.cwGraph,
      fgGraph: state.fgGraph,
      elGraph: state.elGraph,
    });
  },
}));
