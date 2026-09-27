import type { Alarm, AlarmPriority } from '../types/plant';
import type { PlantGraph } from './graph';

export const NOMINAL_FREQUENCY = 60.0;
export const NOMINAL_BUS_VOLTAGE = 1.0;
export const UNDER_FREQUENCY = 57.0;
export const OVER_FREQUENCY = 63.0;
export const UNDER_VOLTAGE = 0.85;
export const GENERATOR_CAPACITY = 1.0;
export const PROCESS_LOAD = 0.6;
export const ESSENTIAL_LOAD = 0.3;
const FREQ_LAG = 0.5;
const SPIN_DOWN_RATE = 15.0;

export interface ElectricalOptions {
  generatorRunning?: boolean;
  generatorTrip?: boolean;
  forceFail?: boolean;
  breakers?: Record<string, boolean>;
  /** Additional service load on top of the closed breakers (0..1 of capacity). */
  extraLoad?: number;
}

export interface ElectricalState {
  frequency: number;
  busVoltage: number;
  electricalOk: boolean;
  breakers: Record<string, boolean>;
  /** Total generator load as a fraction of capacity (breakers + extraLoad). */
  load: number;
}

const DEFAULT_BREAKERS: Record<string, boolean> = {
  'BRK-GEN': true,
  'BRK-MCC': true,
  'BRK-PROC': true,
  'BRK-ESS': true,
};

function activeLoad(breakers: Record<string, boolean>): number {
  return (breakers['BRK-PROC'] ? PROCESS_LOAD : 0) + (breakers['BRK-ESS'] ? ESSENTIAL_LOAD : 0);
}

export function stepElectrical(
  graph: PlantGraph,
  dt: number,
  options: ElectricalOptions = {},
  prev?: ElectricalState
): ElectricalState {
  const gen = graph.nodes.get('GEN-001')!;
  const bus = graph.nodes.get('BUS-MAIN')!;
  const mcc = graph.nodes.get('MCC-001')!;
  const proc = graph.nodes.get('LOAD-PROC')!;
  const ess = graph.nodes.get('LOAD-ESSENTIAL')!;

  const tripped = options.forceFail || options.generatorTrip || false;
  const generatorRunning = options.forceFail ? false : options.generatorRunning ?? true;

  let breakers = { ...(options.breakers ?? prev?.breakers ?? DEFAULT_BREAKERS) };

  let frequency = prev?.frequency ?? NOMINAL_FREQUENCY;
  const totalLoad = activeLoad(breakers) + (options.extraLoad ?? 0);
  if (!generatorRunning || tripped || !breakers['BRK-GEN']) {
    frequency = Math.max(0, frequency - SPIN_DOWN_RATE * dt);
  } else {
    const overload = totalLoad > GENERATOR_CAPACITY ? (totalLoad - GENERATOR_CAPACITY) / GENERATOR_CAPACITY : 0;
    const targetFrequency = NOMINAL_FREQUENCY * (1 - overload * 0.1);
    frequency += (targetFrequency - frequency) * Math.min(FREQ_LAG * dt, 1);
  }

  const busVoltage = (frequency / NOMINAL_FREQUENCY) * NOMINAL_BUS_VOLTAGE;

  // Undervoltage load shedding: drop non-essential process load.
  if (busVoltage < UNDER_VOLTAGE) {
    breakers = { ...breakers, 'BRK-PROC': false };
  }

  // Frequency protection opens the generator breaker.
  if (frequency < UNDER_FREQUENCY || frequency > OVER_FREQUENCY) {
    breakers = { ...breakers, 'BRK-GEN': false };
  }

  gen.pressure = generatorRunning && !tripped && breakers['BRK-GEN'] ? 1.05 : 0;
  bus.pressure = busVoltage;
  mcc.pressure = breakers['BRK-MCC'] ? busVoltage * 0.95 : 0;
  proc.pressure = breakers['BRK-PROC'] ? mcc.pressure : 0;
  ess.pressure = breakers['BRK-ESS'] ? mcc.pressure : 0;

  const electricalOk =
    generatorRunning &&
    !tripped &&
    breakers['BRK-GEN'] &&
    frequency >= UNDER_FREQUENCY &&
    frequency <= OVER_FREQUENCY &&
    busVoltage >= UNDER_VOLTAGE;

  return {
    frequency,
    busVoltage,
    electricalOk,
    breakers,
    load: (activeLoad(breakers) + (options.extraLoad ?? 0)) / GENERATOR_CAPACITY,
  };
}

interface ElecAlarmRule {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
}

const UNDER_VOLTAGE_RULE: ElecAlarmRule = {
  id: 'VOLT-LO-BUS',
  tag: 'VOLT-LO-BUS',
  description: 'Low electrical bus voltage',
  priority: 'CRITICAL',
};

const UNDER_FREQUENCY_RULE: ElecAlarmRule = {
  id: 'UF-BUS',
  tag: 'UF-BUS',
  description: 'Under-frequency on main bus',
  priority: 'HIGH',
};

const OVER_FREQUENCY_RULE: ElecAlarmRule = {
  id: 'OF-BUS',
  tag: 'OF-BUS',
  description: 'Over-frequency on main bus',
  priority: 'HIGH',
};

const GEN_TRIP_RULE: ElecAlarmRule = {
  id: 'ZA-GEN-001',
  tag: 'ZA-GEN-001',
  description: 'Generator trip',
  priority: 'HIGH',
};

function setAlarm(
  next: Map<string, Alarm>,
  rule: ElecAlarmRule,
  value: number,
  threshold: number,
  t: number
): void {
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

export function evaluateElectricalAlarms(
  graph: PlantGraph,
  options: ElectricalOptions,
  state: ElectricalState,
  active: Alarm[],
  t: number
): Alarm[] {
  const next = new Map<string, Alarm>();
  for (const a of active) next.set(a.id, a);

  const bus = graph.nodes.get('BUS-MAIN')!;
  if (bus.pressure < UNDER_VOLTAGE) {
    setAlarm(next, UNDER_VOLTAGE_RULE, bus.pressure, UNDER_VOLTAGE, t);
  } else {
    clearAlarm(next, UNDER_VOLTAGE_RULE.id);
  }

  if (state.frequency < UNDER_FREQUENCY) {
    setAlarm(next, UNDER_FREQUENCY_RULE, state.frequency, UNDER_FREQUENCY, t);
  } else {
    clearAlarm(next, UNDER_FREQUENCY_RULE.id);
  }

  if (state.frequency > OVER_FREQUENCY) {
    setAlarm(next, OVER_FREQUENCY_RULE, state.frequency, OVER_FREQUENCY, t);
  } else {
    clearAlarm(next, OVER_FREQUENCY_RULE.id);
  }

  const tripped = options.forceFail || options.generatorTrip || !state.breakers['BRK-GEN'];
  if (tripped) {
    setAlarm(next, GEN_TRIP_RULE, 1, 1, t);
  } else {
    clearAlarm(next, GEN_TRIP_RULE.id);
  }

  return Array.from(next.values()).filter((a) => a.active);
}

export function isElectricalAlarm(alarm: Alarm): boolean {
  return alarm.id === 'VOLT-LO-BUS' || alarm.id === 'UF-BUS' || alarm.id === 'OF-BUS' || alarm.id === 'ZA-GEN-001';
}
