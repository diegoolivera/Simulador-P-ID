import type { Alarm, AlarmPriority } from '../types/plant';
import type { PlantGraph } from './graph';

export const NOMINAL_REGEN_TEMP = 200.0;
export const LOW_REGEN_TEMP = 185.0;
export const HIGH_REGEN_TEMP = 220.0;
export const MAX_DEW_POINT = -10.0;
export const HIGH_CONTACTOR_LEVEL = 0.85;
const P_LAG = 0.3;

export interface TegOptions {
  circulationPumpRunning?: boolean;
  reboilerRunning?: boolean;
  tripCirculation?: boolean;
  tripReboiler?: boolean;
  forceFail?: boolean;
  /** Glycol circulation as a fraction of design (0..1). Drives the water dew point. */
  circulationRate?: number;
}

export interface TegState {
  dewPoint: number;
  regenTemperature: number;
  contactorLevel: number;
  tegOk: boolean;
}

export function stepTeg(graph: PlantGraph, dt: number, options: TegOptions = {}): TegState {
  const contactor = graph.nodes.get('TEG-CONTACTOR')!;
  const regen = graph.nodes.get('TEG-REGEN')!;
  const dryGas = graph.nodes.get('TEG-DRY-GAS')!;

  const circulation = options.forceFail ? false : options.circulationPumpRunning ?? true;
  const reboiler = options.forceFail ? false : options.reboilerRunning ?? true;
  const rate = options.forceFail ? 0 : Math.min(1, Math.max(0, options.circulationRate ?? 1));

  const circulationOk = circulation && !options.tripCirculation && rate > 0.05;
  const reboilerOk = reboiler && !options.tripReboiler;

  const targetRegen = reboilerOk ? NOMINAL_REGEN_TEMP : (contactor.pressure > 0 ? contactor.pressure * 20 : 20);
  regen.pressure += (targetRegen - regen.pressure) * Math.min(P_LAG * dt, 1);

  const targetLevel = circulationOk ? 0.45 + 0.15 * rate : 0.95;
  contactor.liquidLevel += (targetLevel - contactor.liquidLevel) * Math.min(P_LAG * dt, 1);

  // Dehydration duty scales with circulation: less glycol -> wetter sales gas.
  const effectiveRate = circulationOk ? rate : 0;
  const drynessFactor = reboilerOk ? 0.25 + 0.75 * effectiveRate : 0.3;
  const targetDewPoint = -20 + (1 - drynessFactor) * 25;
  dryGas.pressure += (targetDewPoint - dryGas.pressure) * Math.min(P_LAG * dt, 1);

  const tegOk = dryGas.pressure <= MAX_DEW_POINT && regen.pressure >= LOW_REGEN_TEMP && regen.pressure <= HIGH_REGEN_TEMP && contactor.liquidLevel <= HIGH_CONTACTOR_LEVEL;

  return {
    dewPoint: dryGas.pressure,
    regenTemperature: regen.pressure,
    contactorLevel: contactor.liquidLevel,
    tegOk,
  };
}

interface TegAlarmRule {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
}

const HIGH_DEW_POINT_RULE: TegAlarmRule = {
  id: 'TAHH-TEG-DRY',
  tag: 'TAHH-TEG-DRY',
  description: 'High gas dew point after TEG',
  priority: 'CRITICAL',
};

const LOW_REGEN_RULE: TegAlarmRule = {
  id: 'TALL-TEG-REGEN',
  tag: 'TALL-TEG-REGEN',
  description: 'Low TEG regenerator temperature',
  priority: 'CRITICAL',
};

const HIGH_REGEN_RULE: TegAlarmRule = {
  id: 'TAHH-TEG-REGEN',
  tag: 'TAHH-TEG-REGEN',
  description: 'High TEG regenerator temperature',
  priority: 'HIGH',
};

const HIGH_LEVEL_RULE: TegAlarmRule = {
  id: 'LAHH-TEG-CONT',
  tag: 'LAHH-TEG-CONT',
  description: 'High TEG contactor level',
  priority: 'HIGH',
};

const CIRC_TRIP_RULE: TegAlarmRule = {
  id: 'ZA-TEG-CIRC',
  tag: 'ZA-TEG-CIRC',
  description: 'TEG circulation pump trip',
  priority: 'HIGH',
};

const REBOILER_TRIP_RULE: TegAlarmRule = {
  id: 'ZA-TEG-REBOILER',
  tag: 'ZA-TEG-REBOILER',
  description: 'TEG reboiler trip',
  priority: 'HIGH',
};

function setAlarm(next: Map<string, Alarm>, rule: TegAlarmRule, value: number, threshold: number, t: number): void {
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

export function evaluateTegAlarms(graph: PlantGraph, options: TegOptions, active: Alarm[], t: number): Alarm[] {
  const next = new Map<string, Alarm>();
  for (const a of active) next.set(a.id, a);

  const dryGas = graph.nodes.get('TEG-DRY-GAS')!;
  const regen = graph.nodes.get('TEG-REGEN')!;
  const contactor = graph.nodes.get('TEG-CONTACTOR')!;

  if (dryGas.pressure > MAX_DEW_POINT) {
    setAlarm(next, HIGH_DEW_POINT_RULE, dryGas.pressure, MAX_DEW_POINT, t);
  } else {
    clearAlarm(next, HIGH_DEW_POINT_RULE.id);
  }

  if (regen.pressure < LOW_REGEN_TEMP) {
    setAlarm(next, LOW_REGEN_RULE, regen.pressure, LOW_REGEN_TEMP, t);
  } else {
    clearAlarm(next, LOW_REGEN_RULE.id);
  }

  if (regen.pressure > HIGH_REGEN_TEMP) {
    setAlarm(next, HIGH_REGEN_RULE, regen.pressure, HIGH_REGEN_TEMP, t);
  } else {
    clearAlarm(next, HIGH_REGEN_RULE.id);
  }

  if (contactor.liquidLevel > HIGH_CONTACTOR_LEVEL) {
    setAlarm(next, HIGH_LEVEL_RULE, contactor.liquidLevel, HIGH_CONTACTOR_LEVEL, t);
  } else {
    clearAlarm(next, HIGH_LEVEL_RULE.id);
  }

  if (options.tripCirculation) {
    setAlarm(next, CIRC_TRIP_RULE, 1, 1, t);
  } else {
    clearAlarm(next, CIRC_TRIP_RULE.id);
  }

  if (options.tripReboiler) {
    setAlarm(next, REBOILER_TRIP_RULE, 1, 1, t);
  } else {
    clearAlarm(next, REBOILER_TRIP_RULE.id);
  }

  return Array.from(next.values()).filter((a) => a.active);
}

export function isTegAlarm(alarm: Alarm): boolean {
  return alarm.id.startsWith('TAHH-TEG') || alarm.id.startsWith('TALL-TEG') || alarm.id.startsWith('LAHH-TEG') || alarm.id.startsWith('ZA-TEG');
}
