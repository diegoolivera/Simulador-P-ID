import type { Alarm, AlarmPriority } from '../types/plant';
import type { PlantGraph } from './graph';

export const NOMINAL_PIA_HEADER_PRESSURE = 35.0;
export const LOW_PIA_HEADER_PRESSURE = 28.0;
export const NOMINAL_PIA_FLOW = 500;
export const LOW_PIA_FLOW = 350;
const PUMP_FLOW = 300;
const P_LAG = 0.4;

export interface PiaOptions {
  pumpARunning?: boolean;
  pumpBRunning?: boolean;
  tripA?: boolean;
  tripB?: boolean;
  forceFail?: boolean;
}

export interface PiaState {
  headerPressure: number;
  injectionFlow: number;
  piaOk: boolean;
}

export function stepPia(graph: PlantGraph, dt: number, options: PiaOptions = {}): PiaState {
  const pumpA = graph.nodes.get('PIA-PUMP-A')!;
  const pumpB = graph.nodes.get('PIA-PUMP-B')!;
  const header = graph.nodes.get('PIA-HEADER')!;
  const injWell = graph.nodes.get('PIA-INJ-WELL')!;

  const aRunning = options.forceFail ? false : options.pumpARunning ?? true;
  const bRunning = options.forceFail ? false : options.pumpBRunning ?? true;

  const aSupply = options.tripA || !aRunning ? 0 : PUMP_FLOW;
  const bSupply = options.tripB || !bRunning ? 0 : PUMP_FLOW;
  const totalFlow = aSupply + bSupply;

  pumpA.pressure = aSupply > 0 ? NOMINAL_PIA_HEADER_PRESSURE + 2 : 0;
  pumpB.pressure = bSupply > 0 ? NOMINAL_PIA_HEADER_PRESSURE + 2 : 0;

  const flowRatio = Math.min(1, totalFlow / NOMINAL_PIA_FLOW);
  const targetHeader = NOMINAL_PIA_HEADER_PRESSURE * flowRatio;
  header.pressure += (targetHeader - header.pressure) * Math.min(P_LAG * dt, 1);
  injWell.pressure = header.pressure * 0.92;
  injWell.liquidLevel = totalFlow / NOMINAL_PIA_FLOW;

  const piaOk = header.pressure >= LOW_PIA_HEADER_PRESSURE && totalFlow >= LOW_PIA_FLOW;
  return {
    headerPressure: header.pressure,
    injectionFlow: totalFlow,
    piaOk,
  };
}

interface PiaAlarmRule {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
}

const LOW_PRESSURE_RULE: PiaAlarmRule = {
  id: 'PSLL-PIA-HEADER',
  tag: 'PSLL-PIA-HEADER',
  description: 'Low water injection header pressure',
  priority: 'CRITICAL',
};

const LOW_FLOW_RULE: PiaAlarmRule = {
  id: 'FSLL-PIA-INJ',
  tag: 'FSLL-PIA-INJ',
  description: 'Low water injection flow',
  priority: 'HIGH',
};

const TRIP_A_RULE: PiaAlarmRule = {
  id: 'ZA-PIA-A',
  tag: 'ZA-PIA-A',
  description: 'Water injection pump A trip',
  priority: 'HIGH',
};

const TRIP_B_RULE: PiaAlarmRule = {
  id: 'ZA-PIA-B',
  tag: 'ZA-PIA-B',
  description: 'Water injection pump B trip',
  priority: 'HIGH',
};

function setAlarm(next: Map<string, Alarm>, rule: PiaAlarmRule, value: number, threshold: number, t: number): void {
  const existing = next.get(rule.id);
  if (existing) {
    existing.active = true;
    existing.processValue = value;
  } else {
    next.set(rule.id, {
      id: rule.id,
      tag: rule.tag,
      description: rule.description,
      priority: rule.priority,
      active: true,
      acknowledged: false,
      t,
      processValue: value,
      threshold,
    });
  }
}

function clearAlarm(next: Map<string, Alarm>, id: string): void {
  const existing = next.get(id);
  if (existing) existing.active = false;
}

export function evaluatePiaAlarms(graph: PlantGraph, options: PiaOptions, active: Alarm[], t: number): Alarm[] {
  const next = new Map<string, Alarm>();
  for (const a of active) next.set(a.id, a);

  const header = graph.nodes.get('PIA-HEADER')!;
  const injWell = graph.nodes.get('PIA-INJ-WELL')!;
  const flow = injWell.liquidLevel * NOMINAL_PIA_FLOW;

  if (header.pressure < LOW_PIA_HEADER_PRESSURE) {
    setAlarm(next, LOW_PRESSURE_RULE, header.pressure, LOW_PIA_HEADER_PRESSURE, t);
  } else {
    clearAlarm(next, LOW_PRESSURE_RULE.id);
  }

  if (flow < LOW_PIA_FLOW) {
    setAlarm(next, LOW_FLOW_RULE, flow, LOW_PIA_FLOW, t);
  } else {
    clearAlarm(next, LOW_FLOW_RULE.id);
  }

  if (options.tripA) {
    setAlarm(next, TRIP_A_RULE, 1, 1, t);
  } else {
    clearAlarm(next, TRIP_A_RULE.id);
  }

  if (options.tripB) {
    setAlarm(next, TRIP_B_RULE, 1, 1, t);
  } else {
    clearAlarm(next, TRIP_B_RULE.id);
  }

  return Array.from(next.values()).filter((a) => a.active);
}

export function isPiaAlarm(alarm: Alarm): boolean {
  return alarm.id.startsWith('PSLL-PIA') || alarm.id.startsWith('FSLL-PIA') || alarm.id.startsWith('ZA-PIA');
}
