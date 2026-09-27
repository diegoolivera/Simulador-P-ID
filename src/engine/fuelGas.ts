import type { Alarm, AlarmPriority, Valve } from '../types/plant';
import type { PlantGraph } from './graph';

export const NOMINAL_FG_HEADER_PRESSURE = 3.0;
export const LOW_FG_HEADER_PRESSURE = 2.0;
export const HH_SCRUBBER_LEVEL = 80;
/** Fuel-gas draw at nominal electrical load (sm3/d). */
export const NOMINAL_FG_FLOW = 45_000;
/** V-700 working pressure with no service load (kg/cm2). */
export const NOMINAL_V700_PRESSURE = 7.0;
/** Share of the nominal draw that still burns at zero electrical load (pilot/heaters). */
const IDLE_DEMAND = 0.4;
const NOMINAL_LOAD = 1.0;
const P_LAG = 0.6;
const DEMAND_RATE = 0.35;
const CLAMP = (v: number, min = 0, max = 5.0) => Math.max(min, Math.min(max, v));

export interface FuelGasOptions {
  supplyAvailable?: boolean;
  trip?: boolean;
  forceFail?: boolean;
  /** Electrical load fraction (0 = idle, 1 = generator at capacity). Drives demand. */
  load?: number;
}

export interface FuelGasState {
  headerPressure: number;
  v700Pressure: number;
  /** Fuel-gas draw from the plant outlet, sm3/d. */
  supplyFlow: number;
  fuelGasOk: boolean;
  flameOk: boolean;
}

export function stepFuelGas(
  graph: PlantGraph,
  valves: Map<string, Valve>,
  dt: number,
  options: FuelGasOptions = {}
): FuelGasState {
  const supply = graph.nodes.get('FG-SUPPLY')!;
  const scrubber = graph.nodes.get('FG-001')!;
  const header = graph.nodes.get('FG-HEADER')!;
  const sb006 = graph.nodes.get('SB-006');
  const v700 = graph.nodes.get('V-700');

  const pcv700 = valves.get('PCV-700');
  const pcvOpen = pcv700 ? pcv700.position > 0.05 : true;
  // SDV-006A: take-off from the plant outlet. SDV-026B: skid isolation, and the
  // target of the PAH-001 interlock — closing it starves the whole skid.
  const takeoffOpen = (valves.get('SDV-006A')?.position ?? 1) > 0.05;
  const skidOpen = (valves.get('SDV-026B')?.position ?? 1) > 0.05;

  const tripped = options.forceFail || options.trip || scrubber.liquidLevel > HH_SCRUBBER_LEVEL;
  const available = options.forceFail ? false : takeoffOpen && skidOpen && (options.supplyAvailable ?? pcvOpen);
  const supplyPressure = tripped || !available ? 0 : NOMINAL_FG_HEADER_PRESSURE;

  // Service demand tracks generator load: more load -> more fuel gas drawn from
  // the plant outlet, and a deeper sag on the V-700 / header pressure.
  const load = Math.max(0, options.load ?? NOMINAL_LOAD);
  const demandFactor = IDLE_DEMAND + (1 - IDLE_DEMAND) * Math.min(load / NOMINAL_LOAD, 2);
  const demand = DEMAND_RATE * demandFactor;
  const flow = available && !tripped ? NOMINAL_FG_FLOW * demandFactor : 0;

  supply.pressure = available ? 4.0 : 0;
  supply.gasFlow = flow;

  header.pressure = CLAMP(header.pressure + (supplyPressure - header.pressure) * Math.min(P_LAG * dt, 1) - demand * dt);
  header.gasFlow = flow;

  if (sb006) {
    sb006.pressure += (supply.pressure - sb006.pressure) * Math.min(P_LAG * dt, 1);
    sb006.gasFlow = flow;
  }
  if (v700) {
    // Regulated downstream pressure: sags as the service load grows.
    const target = tripped || !available ? 0 : NOMINAL_V700_PRESSURE * (1 - 0.35 * Math.min(load, 2));
    v700.pressure += (target - v700.pressure) * Math.min(P_LAG * dt, 1);
    v700.gasFlow = flow;
  }

  scrubber.pressure = supplyPressure;
  scrubber.gasFlow = flow;

  const fuelGasOk = header.pressure >= LOW_FG_HEADER_PRESSURE;
  const flameOk = fuelGasOk && !tripped;
  return { headerPressure: header.pressure, v700Pressure: v700?.pressure ?? 0, supplyFlow: flow, fuelGasOk, flameOk };
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
