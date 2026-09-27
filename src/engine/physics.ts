import type { AuditEvent, Loop, PlantEdge, Valve } from '../types/plant';
import type { AlarmRule } from './alarms';
import type { Alarm } from '../types/plant';
import { PlantGraph } from './graph';
import { applyEsd, checkEsdEscalation, EsdLevel } from './esd';
import { applyAirFailure, stepValveStrokes } from './valve';
import { stepLoops } from './loops';
import { evaluateAlarms } from './alarms';
import { applyInterlocks } from './interlock';
import type { InstrumentAirOptions } from './instrumentAir';
import type { CoolingWaterOptions } from './coolingWater';
import type { FuelGasOptions } from './fuelGas';
import type { ElectricalOptions } from './electrical';

export interface PhysicsOptions {
  sourcePressure?: number;
  sourceFlow?: number;
  sourceLiquidFraction?: number;
  sourceSandFraction?: number;
  esdLevel?: number;
  instrumentAirOk?: boolean;
  instrumentAirOptions?: InstrumentAirOptions;
  coolingWaterOk?: boolean;
  coolingWaterOptions?: CoolingWaterOptions;
  fuelGasOk?: boolean;
  fuelGasOptions?: FuelGasOptions;
  electricalOk?: boolean;
  electricalOptions?: ElectricalOptions;
  /** One-shot liquid slug: liquidFlow is m^3/s applied for one tick. */
  slug?: { targetTag: string; liquidFlow: number };
  t?: number;
  loops?: Loop[];
  alarmRules?: AlarmRule[];
  activeAlarms?: Alarm[];
}

/*
 * Units
 *   pressure      kg/cm2
 *   gas flow      sm3/d
 *   liquid flow   m3/d
 *   liquid level  percent of vessel volume (0..100)
 *   volume        m3
 *   dt            seconds
 *
 * Model
 *   Sources inject a fixed boundary flow (exam inlet condition).
 *   Every other node accumulates mass: dP/dt = (Qin - Qout) / C.
 *   Edge flow follows an orifice law Q = c * (K_Q / R) * dP / sqrt(dP + floor),
 *   which gives control valves real authority over pressure and flow.
 *   Liquid is produced at sources, carried through junctions at a conserved
 *   liquid/gas ratio, held by vessels and drained level-driven through liquid lines.
 */
const K_Q = 2_000_000; // sm3/d per sqrt(kg/cm2) at unit conductance
const DP_FLOOR = 0.2; // regularises dQ/dP near zero delta-P (explicit-solver stability)
const C_MIN = 100; // sm3/(kg/cm2) capacitance floor so dt=1 s stays stable
const LIQ_YIELD = 0.00089; // m3 liquid per sm3 gas per unit sourceLiquidFraction (rho_g/rho_l)
const LIQ_DRAIN_K = 1500; // 1/day level-driven drain through liquid lines
const LIQ_CARRY_K = 5; // 1/day mist carryover through gas lines
const LIQ_LINE = /^(LV|DR|XV|BA|SDV-001B|V-(IN|OUT)-)/;
// Pure liquid lines (level/drain valves, tank export): no gas may flow through them.
const GAS_BLOCK = /^(LV|DR|XV|BA|SDV-001B)/;
const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export function stepPhysics(graph: PlantGraph, valves: Map<string, Valve>, dt: number, options: PhysicsOptions = {}): AuditEvent[] {
  const t = options.t ?? 0, audit: AuditEvent[] = [];
  let esdLevel: EsdLevel = (options.esdLevel ?? 0) as EsdLevel;

  applyEsd(esdLevel, valves, audit, t);
  const escalation = checkEsdEscalation(graph);
  if (escalation && escalation > esdLevel) {
    esdLevel = escalation;
    applyEsd(esdLevel, valves, audit, t);
  }
  if (options.instrumentAirOk === false) applyAirFailure(valves.values(), audit, t);
  if (options.loops) stepLoops(options.loops, graph, valves, esdLevel > 0, dt, audit, t);
  stepValveStrokes(valves.values(), dt);

  // 1. Effective valve conductance and per-edge flow resistance (edge.conductance = R)
  const cond = new Map<string, number>();
  const resist = new Map<string, number>();
  for (const e of graph.edges) {
    cond.set(e.id, effectiveC(e, valves));
    resist.set(e.id, Math.max(0.1, e.conductance || 1));
  }

  // 2. Gas flow (sm3/d). Sources are fixed boundary flows; all other edges are
  //    pressure-driven so valves and downstream pressure affect throughput.
  const srcP = options.sourcePressure ?? 80;
  // Per-source boundary flow: 3 well sources x 833_333 ~= 2.5 MM sm3/d total inlet.
  const srcFlow = options.sourceFlow ?? 833_333;
  const gasQ = new Map<string, number>();
  for (const n of graph.nodes.values()) {
    if (n.kind === 'source') n.pressure = srcP;
  }
  for (const e of graph.edges) {
    const up = graph.nodes.get(e.from)!;
    const c = e.valveTag && GAS_BLOCK.test(e.valveTag) ? 0 : cond.get(e.id)!;
    if (c <= 0) {
      gasQ.set(e.id, 0);
      continue;
    }
    if (up.kind === 'source') {
      const outs = graph.outgoingEdges(up.id);
      const totalC = outs.reduce((s, o) => s + cond.get(o.id)!, 0);
      gasQ.set(e.id, totalC > 0 ? (srcFlow * c) / totalC : 0);
      continue;
    }
    const down = graph.nodes.get(e.to)!;
    const dp = Math.max(0, up.pressure + (up.boost ?? 0) - down.pressure);
    gasQ.set(e.id, (c * K_Q * dp) / (resist.get(e.id)! * Math.sqrt(dp + DP_FLOOR)));
  }

  // 3. Node pressure integration (mass accumulation). Sinks hold their data pressure.
  const gasIn = new Map<string, number>();
  const gasOut = new Map<string, number>();
  for (const n of graph.nodes.values()) {
    gasIn.set(n.id, 0);
    gasOut.set(n.id, 0);
  }
  for (const e of graph.edges) {
    const q = gasQ.get(e.id)!;
    gasOut.set(e.from, gasOut.get(e.from)! + q);
    gasIn.set(e.to, gasIn.get(e.to)! + q);
  }
  for (const n of graph.nodes.values()) {
    if (n.kind === 'source' || n.kind === 'sink') continue;
    const qIn = gasIn.get(n.id)!, qOut = gasOut.get(n.id)!;
    const capacitance = Math.max(C_MIN, n.volume);
    if (qIn === 0 && qOut === 0) {
      n.pressure *= Math.max(0, 1 - 0.03 * dt); // stranded side decays
    } else {
      n.pressure += ((qIn - qOut) / (86400 * capacitance)) * dt;
    }
    if (n.pressure < 0) n.pressure = 0;
  }

  // 4. Liquid transport. Junctions/sources carry liquid with gas at a conserved
  //    ratio; vessels hold liquid and drain it level-driven.
  const srcLiquidFraction = options.sourceLiquidFraction ?? 0.02;
  const sandFrac = options.sourceSandFraction ?? 0.01;
  const liqQ = new Map<string, number>(); // m3/d per edge
  const liqIn = new Map<string, number>(); // m3/d per node
  const lgr = new Map<string, number>(); // m3 liquid per sm3 gas
  for (const id of graph.nodes.keys()) liqIn.set(id, 0);

  for (const id of graph.getTopologicalOrder()) {
    const node = graph.nodes.get(id)!;
    let lIn = liqIn.get(id)!;
    const gIn = gasIn.get(id)!;
    // Contactors pick up liquid from the gas stream (condensation / rich-glycol pickup).
    if (node.condensateK && gIn > 0) {
      lIn += gIn * node.condensateK;
      liqIn.set(id, lIn);
    }
    if (node.kind === 'source') {
      lgr.set(id, srcLiquidFraction * LIQ_YIELD);
    } else if (node.kind !== 'vessel') {
      lgr.set(id, gIn > 0 ? lIn / gIn : 0);
    }
    for (const e of graph.outgoingEdges(id)) {
      const c = cond.get(e.id)!;
      if (c <= 0) {
        liqQ.set(e.id, 0);
        continue;
      }
      if (node.kind === 'vessel') {
        const k = e.valveTag && LIQ_LINE.test(e.valveTag) ? (node.drainK ?? LIQ_DRAIN_K) : LIQ_CARRY_K;
        liqQ.set(e.id, c * (node.liquidLevel / 100) * node.volume * k);
      } else {
        liqQ.set(e.id, (gasQ.get(e.id) ?? 0) * (lgr.get(id) ?? 0));
      }
      liqIn.set(e.to, liqIn.get(e.to)! + liqQ.get(e.id)!);
    }
  }

  // 5. Per-node flows for display and exam balances
  for (const n of graph.nodes.values()) {
    n.gasFlow = gasIn.get(n.id) ?? 0;
    n.liquidFlow = liqIn.get(n.id) ?? 0;
  }

  // 6. Vessel balances (level in percent, sand settles with liquid)
  for (const n of graph.nodes.values()) {
    if (n.kind !== 'vessel') continue;
    const lIn = liqIn.get(n.id) ?? 0;
    let lOut = 0, sandOut = 0;
    for (const e of graph.outgoingEdges(n.id)) {
      lOut += liqQ.get(e.id) ?? 0;
      if (e.valveTag && LIQ_LINE.test(e.valveTag)) {
        sandOut += cond.get(e.id)! * (n.sandLevel / 100) * n.volume * LIQ_DRAIN_K;
      }
    }
    const slug = options.slug && options.slug.targetTag === n.tag ? options.slug.liquidFlow : 0;
    const deltaM3 = ((lIn - lOut) / 86400 + slug) * dt;
    n.liquidLevel = clamp(n.liquidLevel + (deltaM3 / n.volume) * 100, 0, 100);
    const deltaSand = ((lIn * sandFrac - sandOut) / 86400) * dt;
    n.sandLevel = clamp(n.sandLevel + (deltaSand / n.volume) * 100, 0, 100);
  }

  if (options.loops && options.alarmRules && options.activeAlarms) {
    const alarms = evaluateAlarms(graph, options.alarmRules, options.activeAlarms, t);
    options.activeAlarms.length = 0;
    options.activeAlarms.push(...alarms);
    // Cause-and-effect: alarm-driven actions run after the alarm scan so an
    // interlock trips on the same tick its cause becomes active.
    applyInterlocks(options.activeAlarms, valves, audit, t);
  }

  return audit;
}

function effectiveC(edge: PlantEdge, valves: Map<string, Valve>): number {
  if (edge.kind === 'pipe') return 1;
  const v = edge.valveTag ? valves.get(edge.valveTag) : undefined;
  return v ? Math.max(0, v.position * (1 - v.leakage)) : 0;
}

export function formatFlow(flow: number): string {
  if (flow >= 1_000_000) return `${(flow / 1_000_000).toFixed(2)} MM`;
  if (flow >= 1000) return `${(flow / 1000).toFixed(1)} k`;
  return `${Math.round(flow)}`;
}
