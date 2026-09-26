import type { Alarm, AlarmPriority } from '../types/plant';
import type { PlantGraph } from './graph';

export const NOMINAL_FG_HEADER_PRESSURE = 3.0;
export const LOW_FG_HEADER_PRESSURE = 2.0;
export const HH_SCRUBBER_LEVEL = 80;
const P_LAG = 0.6;
const DEMAND_RATE = 0.35;
const CLAMP = (v: number, min = 0, max = 5.0) => Math.max(min, Math.min(max, v));

export interface FuelGasOptions {
  supplyAvailable?: boolean;
  trip?: boolean;
  forceFail?: boolean;
}

export interface FuelGasState {
  headerPressure: number;
  fuelGasOk: boolean;
  flameOk: boolean;
}

export function stepFuelGas(
  graph: PlantGraph,
  dt: number,
  options: FuelGasOptions = {}
): FuelGasState {
  const supply = graph.nodes.get('FG-SUPPLY')!;
  const scrubber = graph.nodes.get('FG-001')!;
  const header = graph.nodes.get('FG-HEADER')!;

  const tripped = options.forceFail || options.trip || scrubber.liquidLevel > HH_SCRUBBER_LEVEL;
  const available = options.forceFail ? false : options.supplyAvailable ?? true;
  const supplyPressure = tripped || !available ? 0 : NOMINAL_FG_HEADER_PRESSURE;

  supply.pressure = available ? 4.0 : 0;
  scrubber.pressure = supplyPressure;

  header.pressure = CLAMP(
    header.pressure + (supplyPressure - header.pressure) * Math.min(P_LAG * dt, 1) - DEMAND_RATE * dt
  );

  const fuelGasOk = header.pressure >= LOW_FG_HEADER_PRESSURE;
  const flameOk = fuelGasOk && !tripped;
  return { headerPressure: header.pressure, fuelGasOk, flameOk };
}

interface FgAlarmRule {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
}

const LOW_PRESSURE_RULE: FgAlarmRule = {
  id: 'PSLL-FG',
  tag: 'PSLL-FG',
  description: 'Low fuel-gas header pressure',
  priority: 'CRITICAL',
};

const TRIP_RULE: FgAlarmRule = {
  id: 'ZA-FG-001',
  tag: 'ZA-FG-001',
  description: 'Fuel-gas scrubber high-high level trip',
  priority: 'HIGH',
};

function setAlarm(next: Map<string, Alarm>, rule: FgAlarmRule, value: number, threshold: number, t: number): void {
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

export function evaluateFuelGasAlarms(
  graph: PlantGraph,
  options: FuelGasOptions,
  active: Alarm[],
  t: number
): Alarm[] {
  const next = new Map<string, Alarm>();
  for (const a of active) next.set(a.id, a);

  const header = graph.nodes.get('FG-HEADER')!;
  if (header.pressure < LOW_FG_HEADER_PRESSURE) {
    setAlarm(next, LOW_PRESSURE_RULE, header.pressure, LOW_FG_HEADER_PRESSURE, t);
  } else {
    clearAlarm(next, LOW_PRESSURE_RULE.id);
  }

  const scrubber = graph.nodes.get('FG-001')!;
  const tripped = options.forceFail || options.trip || scrubber.liquidLevel > HH_SCRUBBER_LEVEL;
  if (tripped) {
    setAlarm(next, TRIP_RULE, 1, 1, t);
  } else {
    clearAlarm(next, TRIP_RULE.id);
  }

  return Array.from(next.values()).filter((a) => a.active);
}

export function isFuelGasAlarm(alarm: Alarm): boolean {
  return alarm.id === 'PSLL-FG' || alarm.id === 'ZA-FG-001';
}
