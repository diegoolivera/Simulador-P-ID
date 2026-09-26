import type { Alarm, AlarmPriority } from '../types/plant';
import type { PlantGraph } from './graph';

export const NOMINAL_CW_HEADER_PRESSURE = 4.0;
export const LOW_CW_HEADER_PRESSURE = 3.0;
const PUMP_FLOW = 100;
const DEMAND_FLOW = 80;
const SUPPLY_PRESSURE_RISE = 0.8;
const P_LAG = 0.5;

export interface CoolingWaterOptions {
  pumpARunning?: boolean;
  pumpBRunning?: boolean;
  tripA?: boolean;
  tripB?: boolean;
  forceFail?: boolean;
}

export interface CoolingWaterState {
  headerPressure: number;
  coolingWaterOk: boolean;
  flow: number;
}

export function stepCoolingWater(
  graph: PlantGraph,
  dt: number,
  options: CoolingWaterOptions = {}
): CoolingWaterState {
  const pumpA = graph.nodes.get('CW-PUMP-A')!;
  const pumpB = graph.nodes.get('CW-PUMP-B')!;
  const header = graph.nodes.get('CW-HEADER')!;
  const ret = graph.nodes.get('CW-RETURN')!;

  const aRunning = options.forceFail ? false : options.pumpARunning ?? true;
  const bRunning = options.forceFail ? false : options.pumpBRunning ?? true;

  const aSupply = options.tripA || !aRunning ? 0 : PUMP_FLOW;
  const bSupply = options.tripB || !bRunning ? 0 : PUMP_FLOW;
  const totalFlow = aSupply + bSupply;

  pumpA.pressure = aSupply > 0 ? NOMINAL_CW_HEADER_PRESSURE + SUPPLY_PRESSURE_RISE : 0;
  pumpB.pressure = bSupply > 0 ? NOMINAL_CW_HEADER_PRESSURE + SUPPLY_PRESSURE_RISE : 0;

  const flowRatio = Math.min(1, totalFlow / DEMAND_FLOW);
  const targetHeader = NOMINAL_CW_HEADER_PRESSURE * flowRatio;
  header.pressure += (targetHeader - header.pressure) * Math.min(P_LAG * dt, 1);
  ret.pressure = header.pressure * 0.95;

  const coolingWaterOk = header.pressure >= LOW_CW_HEADER_PRESSURE;
  return {
    headerPressure: header.pressure,
    coolingWaterOk,
    flow: Math.min(totalFlow, DEMAND_FLOW),
  };
}

interface CwAlarmRule {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
}

const LOW_PRESSURE_RULE: CwAlarmRule = {
  id: 'PSLL-CW',
  tag: 'PSLL-CW',
  description: 'Low cooling water header pressure',
  priority: 'CRITICAL',
};

const TRIP_A_RULE: CwAlarmRule = {
  id: 'ZA-CW-A',
  tag: 'ZA-CW-A',
  description: 'Cooling water pump A trip',
  priority: 'HIGH',
};

const TRIP_B_RULE: CwAlarmRule = {
  id: 'ZA-CW-B',
  tag: 'ZA-CW-B',
  description: 'Cooling water pump B trip',
  priority: 'HIGH',
};

function setAlarm(next: Map<string, Alarm>, rule: CwAlarmRule, value: number, threshold: number, t: number): void {
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

export function evaluateCoolingWaterAlarms(
  graph: PlantGraph,
  options: CoolingWaterOptions,
  active: Alarm[],
  t: number
): Alarm[] {
  const next = new Map<string, Alarm>();
  for (const a of active) next.set(a.id, a);

  const header = graph.nodes.get('CW-HEADER')!;
  if (header.pressure < LOW_CW_HEADER_PRESSURE) {
    setAlarm(next, LOW_PRESSURE_RULE, header.pressure, LOW_CW_HEADER_PRESSURE, t);
  } else {
    clearAlarm(next, LOW_PRESSURE_RULE.id);
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

export function isCoolingWaterAlarm(alarm: Alarm): boolean {
  return alarm.id === 'PSLL-CW' || alarm.id === 'ZA-CW-A' || alarm.id === 'ZA-CW-B';
}
