import { commandValve } from './valve';
import type { AuditEvent, Loop, LoopKind, Valve } from '../types/plant';
import type { PlantGraph } from './graph';

export interface LoopConfig {
  tag: string;
  kind: LoopKind;
  setpoint: number;
  valveTag: string;
  pvNodeTag: string;
  pvField: 'pressure' | 'liquidLevel';
  kp: number;
  ki: number;
  outputMin: number;
  outputMax: number;
}

export const PHASE1_LOOPS: LoopConfig[] = [
  { tag: 'PIC-101', kind: 'PIC', setpoint: 70, valveTag: 'PV-101', pvNodeTag: 'SB-001', pvField: 'pressure', kp: 0.02, ki: 0.01, outputMin: 0, outputMax: 1 },
  { tag: 'LIC-001BA', kind: 'LIC', setpoint: 50, valveTag: 'LV-001BA', pvNodeTag: 'SB-001', pvField: 'liquidLevel', kp: 0.02, ki: 0.01, outputMin: 0, outputMax: 1 },
  { tag: 'LIC-004', kind: 'LIC', setpoint: 50, valveTag: 'LV-004', pvNodeTag: 'SB-004', pvField: 'liquidLevel', kp: 0.02, ki: 0.01, outputMin: 0, outputMax: 1 },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function createLoop(config: LoopConfig): Loop {
  return {
    id: config.tag,
    tag: config.tag,
    kind: config.kind,
    setpoint: config.setpoint,
    mode: 'AUTO',
    output: 0,
    processVariable: 0,
    integral: 0,
    kp: config.kp,
    ki: config.ki,
    outputMin: config.outputMin,
    outputMax: config.outputMax,
    valveTag: config.valveTag,
    pvNodeTag: config.pvNodeTag,
    pvField: config.pvField,
  };
}

export function stepLoops(
  loops: Loop[],
  graph: PlantGraph,
  valves: Map<string, Valve>,
  esdActive: boolean,
  dt: number,
  audit: AuditEvent[],
  t: number
): void {
  for (const loop of loops) {
    if (esdActive) {
      loop.mode = 'MAN';
      loop.integral = 0;
      continue;
    }
    if (loop.mode !== 'AUTO') continue;

    const node = graph.nodes.get(loop.pvNodeTag);
    if (!node) continue;
    loop.processVariable = node[loop.pvField];

    const error = loop.processVariable - loop.setpoint;
    loop.integral += error * dt;
    const output = loop.kp * error + loop.ki * loop.integral;
    const clamped = clamp(output, loop.outputMin, loop.outputMax);
    if (output !== clamped && loop.ki > 0) {
      loop.integral -= (output - clamped) / loop.ki;
    }
    loop.output = clamped;

    const valve = valves.get(loop.valveTag);
    if (valve) commandValve(valve, loop.output, 'auto', `${loop.tag} AUTO output`, audit, t);
  }
}
