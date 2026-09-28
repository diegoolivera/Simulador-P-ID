import { create } from 'zustand';
import type { PlantGraph } from '../engine/graph';
import type { Alarm } from '../types/plant';
import type { EsdLevel } from '../engine/esd';
import type { PhysicsOptions } from '../engine/physics';
import { SCENARIO_CATALOG } from '../scenarios/catalog';
import { useEvalStore } from './evalStore';

export type TriggerKind = 'slug' | 'esd' | 'sand' | 'air' | 'inlet';

export interface ScenarioTrigger {
  at: number;
  kind: TriggerKind;
  payload: Record<string, unknown>;
}

export type EndKind = 'time' | 'alarm' | 'level' | 'esd';

export interface EndCondition {
  kind: EndKind;
  tag?: string;
  field?: 'pressure' | 'liquidLevel' | 'demisterDP';
  threshold?: number;
  comparator?: '>' | '<';
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  duration: number;
  baseOptions: Partial<PhysicsOptions>;
  triggers: ScenarioTrigger[];
  win: EndCondition[];
  fail: EndCondition[];
}

type ScenarioStatus = 'idle' | 'running' | 'won' | 'lost';

type State = {
  scenarios: Record<string, Scenario>;
  activeId: string | null;
  active: Scenario | null;
  status: ScenarioStatus;
  elapsed: number;
  triggerIndex: number;
  currentOptions: Partial<PhysicsOptions>;
  loadScenario: (id: string) => boolean;
  reset: () => void;
  step: (dt: number) => void;
  getPhysicsOptions: () => Partial<PhysicsOptions>;
  checkEndConditions: (graph: PlantGraph, alarms: Alarm[], esdLevel: EsdLevel) => 'won' | 'lost' | null;
};

const fire = (trigger: ScenarioTrigger, options: Partial<PhysicsOptions>) => {
  if (trigger.kind === 'slug') {
    options.slug = { targetTag: trigger.payload.targetTag as string, liquidFlow: trigger.payload.liquidFlow as number };
  } else if (trigger.kind === 'esd') {
    options.esdLevel = (trigger.payload.level ?? 1) as EsdLevel;
  } else if (trigger.kind === 'air') {
    options.instrumentAirOk = false;
  } else if (trigger.kind === 'sand') {
    options.sourceSandFraction = trigger.payload.fraction as number;
  } else if (trigger.kind === 'inlet') {
    // Step change on the plant inlet (exam Nivel 2: +20% flow disturbance).
    options.sourceFlow = trigger.payload.sourceFlow as number;
  }
};

/**
 * Threshold comparison for end conditions. `comparator: '>'` must be strict:
 * an inclusive `>=` treats "reached the threshold" as "exceeded it", which
 * loses a scenario on its very first tick whenever the threshold is 0. An
 * absent comparator keeps the historical "at or beyond".
 */
const meets = (value: number, c: EndCondition, fallback: number): boolean => {
  const t = c.threshold ?? fallback;
  if (c.comparator === '<') return value < t;
  if (c.comparator === '>') return value > t;
  return value >= t;
};

const evalCondition = (c: EndCondition, graph: PlantGraph, alarms: Alarm[], elapsed: number, esdLevel: EsdLevel): boolean => {
  if (c.kind === 'time') return elapsed >= (c.threshold ?? 0);
  if (c.kind === 'esd') return meets(esdLevel, c, 1);
  if (c.kind === 'alarm') {
    const active = alarms.some((a) => a.active && (a.id === c.tag || a.tag === c.tag));
    return c.comparator === '<' ? !active : active;
  }
  if (c.kind === 'level') {
    const node = graph.nodes.get(c.tag ?? '');
    const value = node?.[c.field ?? 'pressure'];
    return value === undefined ? false : meets(value, c, 0);
  }
  return false;
};

export const useScenarioStore = create<State>()((set, get) => ({
  scenarios: SCENARIO_CATALOG,
  activeId: null,
  active: null,
  status: 'idle',
  elapsed: 0,
  triggerIndex: 0,
  currentOptions: {},
  loadScenario: (id) => {
    const s = get().scenarios[id];
    if (!s) return false;
    useEvalStore.getState().startScenario();
    set({ activeId: id, active: s, status: 'running', elapsed: 0, triggerIndex: 0, currentOptions: { ...s.baseOptions } });
    return true;
  },
  reset: () => set({ activeId: null, active: null, status: 'idle', elapsed: 0, triggerIndex: 0, currentOptions: {} }),
  step: (dt) => {
    const state = get();
    if (state.status !== 'running' || !state.active) return;
    const elapsed = state.elapsed + dt;
    const opts = { ...state.currentOptions };
    // Both `slug` and `esdLevel` are one-tick impulses: they are applied on the
    // tick the trigger fires and then handed back to the live store state.
    // Leaving `esdLevel` in currentOptions pinned it forever, because tick does
    // `Math.max(state.esdLevel, opts.esdLevel ?? 0)` — so resetEsd() set 0 and
    // the next tick restored 1, making the ESD unrecoverable while running.
    delete opts.slug;
    delete opts.esdLevel;
    let index = state.triggerIndex;
    while (index < state.active.triggers.length && state.active.triggers[index].at <= elapsed) {
      fire(state.active.triggers[index], opts);
      index++;
    }
    set({ elapsed, triggerIndex: index, currentOptions: opts });
  },
  getPhysicsOptions: () => get().currentOptions,
  checkEndConditions: (graph, alarms, esdLevel) => {
    const state = get();
    if (state.status !== 'running' || !state.active) return null;
    for (const c of state.active.fail) {
      if (evalCondition(c, graph, alarms, state.elapsed, esdLevel)) {
        set({ status: 'lost' });
        return 'lost';
      }
    }
    if (state.active.win.every((c) => evalCondition(c, graph, alarms, state.elapsed, esdLevel))) {
      set({ status: 'won' });
      return 'won';
    }
    if (state.elapsed >= state.active.duration) {
      set({ status: 'lost' });
      return 'lost';
    }
    return null;
  },
}));
