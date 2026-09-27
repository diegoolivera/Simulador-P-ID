import { commandValve } from './valve';
import type { AuditEvent, Loop, LoopKind, Valve } from '../types/plant';
import type { PlantGraph } from './graph';

export interface LoopConfig {
  tag: string;
  kind: LoopKind;
  setpoint: number;
  valveTag: string;
  pvNodeTag: string;
  pvField: 'pressure' | 'liquidLevel' | 'gasFlow';
  kp: number;
  ki: number;
  outputMin: number;
  outputMax: number;
  /** Defaults to 'reverse' (PV - SP), correct for drain/throttle-out valves. */
  action?: 'direct' | 'reverse';
  /**
   * Output at creation (= integral pre-load output/ki so err=0 stays there).
   * The PIC/FIC pair sits on a near-neutral family (fixed-flow sources give no
   * pressure anchor); starting at the design operating point keeps the integral
   * frozen at design instead of wandering to a pegged, path-dependent rest.
   */
  initialOutput?: number;
}

export const PHASE1_LOOPS: LoopConfig[] = [
  // Design point: dp across PV-6505 = 89 - 85 = 4 kg/cm2 at 2.5 MM sm3/d -> c ~ 0.38.
  { tag: 'PIC-6505', kind: 'PIC', setpoint: 89, valveTag: 'PV-6505', pvNodeTag: 'V-6505', pvField: 'pressure', kp: 0.1, ki: 0.05, outputMin: 0, outputMax: 1, initialOutput: 0.38 },
  { tag: 'LIC-6505', kind: 'LIC', setpoint: 50, valveTag: 'LV-6505', pvNodeTag: 'V-6505', pvField: 'liquidLevel', kp: 0.02, ki: 0.01, outputMin: 0, outputMax: 1 },
  { tag: 'LIC-004', kind: 'LIC', setpoint: 50, valveTag: 'LV-004', pvNodeTag: 'SB-004', pvField: 'liquidLevel', kp: 0.02, ki: 0.01, outputMin: 0, outputMax: 1 },
  // PV in sm3/d, so gains are tiny (setpoint 1_250_000 sm3/d).
  // FICs throttle an inlet valve (opening raises PV) -> direct action, err = SP - PV.
  // Gains are set by loop gain, not by speed: at the operating point dPV/dc ~ 4.5e6,
  // so kp must stay below ~2e-7 or the sampled loop (dt=1s, stroke=2s) goes bang-bang.
  // ki keeps ki*|err|*dt < ~0.01 of the output range per tick (no integrator chatter).
  // Design point: KG-31 suction 49 + boost 40 - TC 80 = dp 9 -> c ~ 0.65 (dp_FV ~ 8.6,
  // SB-004 ~ 86 -> V-6505 floor ~ 86.7, so PIC-6505 modulates around SP 89).
  { tag: 'FIC-185', kind: 'FIC', setpoint: 1_250_000, valveTag: 'FV-185', pvNodeTag: 'TC-11', pvField: 'gasFlow', kp: 1e-7, ki: 5e-9, outputMin: 0, outputMax: 1, action: 'direct', initialOutput: 0.65 },
  { tag: 'FIC-186', kind: 'FIC', setpoint: 1_250_000, valveTag: 'FV-186', pvNodeTag: 'TC-12', pvField: 'gasFlow', kp: 1e-7, ki: 5e-9, outputMin: 0, outputMax: 1, action: 'direct', initialOutput: 0.65 },
  { tag: 'LIC-002', kind: 'LIC', setpoint: 50, valveTag: 'LV-002', pvNodeTag: 'ST-002', pvField: 'liquidLevel', kp: 0.02, ki: 0.01, outputMin: 0, outputMax: 1 },
  { tag: 'LIC-003', kind: 'LIC', setpoint: 50, valveTag: 'LV-003', pvNodeTag: 'ST-003', pvField: 'liquidLevel', kp: 0.02, ki: 0.01, outputMin: 0, outputMax: 1 },
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function createLoop(config: LoopConfig): Loop {
  const output = config.initialOutput ?? 0;
  return {
    id: config.tag,
    tag: config.tag,
    kind: config.kind,
    setpoint: config.setpoint,
    mode: 'AUTO',
    output,
    processVariable: 0,
    // Pre-load the integrator so err = 0 reproduces the design output exactly.
    integral: config.ki > 0 ? output / config.ki : 0,
    kp: config.kp,
    ki: config.ki,
    outputMin: config.outputMin,
    outputMax: config.outputMax,
    valveTag: config.valveTag,
    pvNodeTag: config.pvNodeTag,
    pvField: config.pvField,
    action: config.action ?? 'reverse',
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
    // liquidLevel is stored as percent of volume; setpoints for LICs are in percent.
    // gasFlow is stored in sm3/d; setpoints for FICs are in sm3/d.
    loop.processVariable = node[loop.pvField];

    // direct: err = SP - PV (valve opens to raise PV); reverse: err = PV - SP (valve opens to lower PV).
    const error = loop.action === 'direct' ? loop.setpoint - loop.processVariable : loop.processVariable - loop.setpoint;
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
