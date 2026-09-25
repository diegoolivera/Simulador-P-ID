import { create } from 'zustand';
import type { Alarm, AuditEvent, CommandPriority, Loop, Valve } from '../types/plant';
import type { EsdLevel } from '../engine/esd';
import { canResetEsd, checkEsdEscalation } from '../engine/esd';
import { PlantGraph } from '../engine/graph';
import { createPhase1Graph } from '../data/phase1';
import { commandValve as applyCommand, createValve, failPositionFromTag, valveTypeFromTag } from '../engine/valve';
import { createLoop, PHASE1_LOOPS } from '../engine/loops';
import { PHASE1_ALARM_RULES } from '../engine/alarms';
import { stepPhysics, type PhysicsOptions } from '../engine/physics';
import { useScenarioStore } from './scenarioStore';
import { useEvalStore } from './evalStore';

type State = {
  graph: PlantGraph;
  valves: Map<string, Valve>;
  loops: Loop[];
  activeAlarms: Alarm[];
  esdLevel: EsdLevel;
  instrumentAirOk: boolean;
  t: number;
  running: boolean;
  scenarioOptions: Partial<PhysicsOptions>;
  init: () => void;
  commandValve: (tag: string, target: number, priority: CommandPriority, reason: string) => boolean;
  setEsdLevel: (level: EsdLevel) => void;
  resetEsd: (checklistComplete: boolean) => boolean;
  setInstrumentAirOk: (ok: boolean) => void;
  setRunning: (running: boolean) => void;
  setScenarioOptions: (options: Partial<PhysicsOptions>) => void;
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
  return {
    graph,
    valves: buildValves(graph),
    loops: PHASE1_LOOPS.map(createLoop),
    activeAlarms: [] as Alarm[],
    esdLevel: 0 as EsdLevel,
    instrumentAirOk: true,
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
  setRunning: (running) => set({ running }),
  setScenarioOptions: (options) => set({ scenarioOptions: options }),
  tick: (dt) => {
    const state = get();
    if (!state.running) return;
    const scenario = useScenarioStore.getState();
    scenario.step(dt);
    const opts = scenario.getPhysicsOptions();
    const options: PhysicsOptions = {
      ...state.scenarioOptions,
      ...opts,
      t: state.t,
      loops: state.loops,
      alarmRules: PHASE1_ALARM_RULES,
      activeAlarms: state.activeAlarms,
      esdLevel: Math.max(state.esdLevel, (opts.esdLevel ?? 0) as EsdLevel),
      instrumentAirOk: opts.instrumentAirOk ?? state.instrumentAirOk,
    };
    const audit = stepPhysics(state.graph, state.valves, dt, options);
    if (audit.length) useEvalStore.getState().record(audit);
    const newEsd = (checkEsdEscalation(state.graph) ?? options.esdLevel ?? state.esdLevel) as EsdLevel;
    scenario.checkEndConditions(state.graph, state.activeAlarms, newEsd);
    set({
      t: state.t + dt,
      valves: new Map(state.valves),
      loops: [...state.loops],
      activeAlarms: [...state.activeAlarms],
      esdLevel: newEsd,
      instrumentAirOk: options.instrumentAirOk ?? state.instrumentAirOk,
    });
  },
}));
