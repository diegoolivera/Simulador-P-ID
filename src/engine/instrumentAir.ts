import type { Alarm, AlarmPriority } from '../types/plant';
import type { PlantGraph } from './graph';

export const NOMINAL_HEADER_PRESSURE = 7.0;
export const LOW_HEADER_PRESSURE = 5.5;
export const CRITICAL_HEADER_PRESSURE = 4.0;
const SUPPLY_RATE = 0.8;
const DEMAND_RATE = 0.4;
const CLAMP = (v: number, min = 0, max = NOMINAL_HEADER_PRESSURE) => Math.max(min, Math.min(max, v));

export interface InstrumentAirOptions {
  compARunning?: boolean;
  compBRunning?: boolean;
  tripA?: boolean;
  tripB?: boolean;
  forceFail?: boolean;
}

export function stepInstrumentAir(
  graph: PlantGraph,
  dt: number,
  options: InstrumentAirOptions = {}
): { headerPressure: number; instrumentAirOk: boolean } {
  const compA = graph.nodes.get('IA-COMP-A')!;
  const compB = graph.nodes.get('IA-COMP-B')!;
  const recv = graph.nodes.get('IA-RECV')!;
  const header = graph.nodes.get('IA-HEADER')!;

  const aRunning = options.forceFail ? false : options.compARunning ?? true;
  const bRunning = options.forceFail ? false : options.compBRunning ?? true;

  const aSupply = options.tripA || !aRunning ? 0 : NOMINAL_HEADER_PRESSURE;
  const bSupply = options.tripB || !bRunning ? 0 : NOMINAL_HEADER_PRESSURE;

  compA.pressure = aSupply;
  compB.pressure = bSupply;
  recv.pressure = aSupply + bSupply > 0 ? (aSupply + bSupply) / (aSupply > 0 && bSupply > 0 ? 2 : 1) : 0;

  const runningCount = (aSupply > 0 ? 1 : 0) + (bSupply > 0 ? 1 : 0);
  const netRate = runningCount * SUPPLY_RATE - DEMAND_RATE;
  header.pressure = CLAMP(header.pressure + netRate * dt);

  const instrumentAirOk = header.pressure >= LOW_HEADER_PRESSURE;
  return { headerPressure: header.pressure, instrumentAirOk };
}

interface IaAlarmRule {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
}

const LOW_PRESSURE_RULE: IaAlarmRule = {
  id: 'PSLL-IA',
  tag: 'PSLL-IA',
  description: 'Low instrument air header pressure',
  priority: 'CRITICAL',
};

const TRIP_A_RULE: IaAlarmRule = {
  id: 'ZA-001A',
  tag: 'ZA-001A',
  description: 'Instrument air compressor A trip',
  priority: 'HIGH',
};

const TRIP_B_RULE: IaAlarmRule = {
  id: 'ZA-001B',
  tag: 'ZA-001B',
  description: 'Instrument air compressor B trip',
  priority: 'HIGH',
};

function setAlarm(next: Map<string, Alarm>, rule: IaAlarmRule, value: number, t: number): void {
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
      threshold: rule.id === 'PSLL-IA' ? LOW_HEADER_PRESSURE : 1,
    });
  }
}

function clearAlarm(next: Map<string, Alarm>, id: string): void {
  const existing = next.get(id);
  if (existing) existing.active = false;
}

export function evaluateInstrumentAirAlarms(
  graph: PlantGraph,
  options: InstrumentAirOptions,
  active: Alarm[],
  t: number
): Alarm[] {
  const next = new Map<string, Alarm>();
  for (const a of active) next.set(a.id, a);

  const header = graph.nodes.get('IA-HEADER')!;
  if (header.pressure < LOW_HEADER_PRESSURE) {
    setAlarm(next, LOW_PRESSURE_RULE, header.pressure, t);
  } else {
    clearAlarm(next, LOW_PRESSURE_RULE.id);
  }

  if (options.tripA) {
    setAlarm(next, TRIP_A_RULE, 1, t);
  } else {
    clearAlarm(next, TRIP_A_RULE.id);
  }

  if (options.tripB) {
    setAlarm(next, TRIP_B_RULE, 1, t);
  } else {
    clearAlarm(next, TRIP_B_RULE.id);
  }

  return Array.from(next.values()).filter((a) => a.active);
}

export function isInstrumentAirAlarm(alarm: Alarm): boolean {
  return alarm.id === 'PSLL-IA' || alarm.id === 'ZA-001A' || alarm.id === 'ZA-001B';
}
