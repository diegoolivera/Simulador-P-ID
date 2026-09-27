import type { AuditEvent, CommandPriority, FailPosition, Valve, ValveType } from '../types/plant';

const RANK: Record<CommandPriority, number> = { loto: 100, esd: 80, interlock: 60, auto: 40, manual: 20 };
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export function valveTypeFromTag(tag: string): ValveType {
  if (/^(PV|LV|CV|FV)/.test(tag)) return 'control';
  if (/^SDV/.test(tag)) return 'sdv';
  if (/^BDV/.test(tag)) return 'bdv';
  if (/^PSV/.test(tag)) return 'psv';
  return 'manual';
}

export function failPositionFromTag(tag: string): FailPosition {
  return /^(BDV|PSV|VT)/.test(tag) ? 'FO' : 'FC';
}

export function createValve(
  tag: string,
  type: ValveType,
  failPosition: FailPosition,
  strokeTime = 2,
  leakage = 0.01
): Valve {
  return {
    id: tag,
    tag,
    type,
    failPosition,
    strokeTime,
    position: 1,
    targetPosition: 1,
    locked: false,
    lastPriority: 'manual',
    leakage,
  };
}

export function commandValve(
  valve: Valve,
  target: number,
  priority: CommandPriority,
  reason: string,
  audit: AuditEvent[],
  t: number
): boolean {
  target = clamp(target);
  if (valve.locked) return false;
  if (RANK[priority] < RANK[valve.lastPriority] && valve.targetPosition !== target) return false;
  if (valve.targetPosition === target) return true;
  const from = valve.targetPosition;
  valve.targetPosition = target;
  valve.lastPriority = priority;
  const sourceMap: Record<CommandPriority, AuditEvent['source']> = {
    loto: 'operator',
    esd: 'esd',
    interlock: 'interlock',
    auto: 'loop',
    manual: 'operator',
  };
  audit.push({ t, source: sourceMap[priority], tag: valve.tag, field: 'targetPosition', from, to: target, reason });
  return true;
}

export function stepValveStrokes(valves: Iterable<Valve>, dt: number): void {
  for (const v of valves) {
    const delta = v.targetPosition - v.position;
    if (Math.abs(delta) < 1e-6) continue;
    const step = Math.min(Math.abs(delta), dt / Math.max(v.strokeTime, 1e-3));
    v.position += Math.sign(delta) * step;
  }
}

export function setLock(valve: Valve, locked: boolean): void {
  valve.locked = locked;
  if (locked) {
    valve.targetPosition = valve.position;
    valve.lastPriority = 'loto';
  }
}

/**
 * SDV-007 is the instrument-air skid isolation itself: it is the CAUSE of an air
 * loss, not an air-loaded actuator downstream of it. Failing it closed here
 * would make the loss self-latching (header can never recharge), so it stays
 * under operator control.
 */
const AIR_ISOLATION_TAGS = new Set(['SDV-007']);

export function applyAirFailure(valves: Iterable<Valve>, audit: AuditEvent[], t: number): void {
  for (const v of valves) {
    if (AIR_ISOLATION_TAGS.has(v.tag)) continue;
    const target = v.failPosition === 'FO' ? 1 : v.failPosition === 'FL' ? v.position : 0;
    commandValve(v, target, 'esd', 'Instrument air failure', audit, t);
  }
}

/**
 * Hands control back to the loops/operator after an `esd`-priority fail-safe
 * command (air failure or ESD) has gone away. Without this the priority gate
 * latches forever and no loop can ever move its valve again. Releasing to
 * 'manual' (the lowest rank) restores the factory state, so both `auto` loop
 * commands and operator `manual` commands are accepted again.
 *
 * Takes the Map (not an Iterable) on purpose: iterating a Map directly yields
 * [key, value] pairs, which silently makes this a no-op.
 */
export function releaseFailSafe(valves: Map<string, Valve>): void {
  for (const v of valves.values()) {
    if (v.lastPriority === 'esd') v.lastPriority = 'manual';
  }
}
