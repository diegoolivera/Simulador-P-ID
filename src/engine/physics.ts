import type { Alarm, AuditEvent, Loop, PlantEdge, Valve } from '../types/plant';
import type { AlarmRule } from './alarms';
import { PlantGraph } from './graph';
import { applyEsd, checkEsdEscalation, EsdLevel } from './esd';
import { applyAirFailure, stepValveStrokes } from './valve';
import { stepLoops } from './loops';
import { evaluateAlarms } from './alarms';

export interface PhysicsOptions {
  sourcePressure?: number;
  sourceFlow?: number;
  sourceLiquidFraction?: number;
  sourceSandFraction?: number;
  esdLevel?: number;
  instrumentAirOk?: boolean;
  slug?: { targetTag: string; liquidFlow: number };
  t?: number;
  loops?: Loop[];
  alarmRules?: AlarmRule[];
  activeAlarms?: Alarm[];
}

const P_LAG = 0.5, P_SCALE = 0.5, SINK_BLEED = 0.1;
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

  const cond = new Map<string, number>();
  for (const e of graph.edges) cond.set(e.id, effectiveC(e, valves));

  const net = new Map<string, number>(), pTarget = new Map<string, number>(), pWeight = new Map<string, number>();
  for (const id of graph.nodes.keys()) net.set(id, 0);

  const srcFlow = options.sourceFlow ?? 100, srcP = options.sourcePressure ?? 80;
  for (const id of graph.getTopologicalOrder()) {
    const node = graph.nodes.get(id)!;
    if (node.kind === 'source') {
      node.pressure = srcP;
      const outs = graph.outgoingEdges(id);
      const totalC = outs.reduce((s, e) => s + cond.get(e.id)!, 0);
      if (totalC > 0) for (const e of outs) {
        const f = srcFlow * (cond.get(e.id)! / totalC);
        net.set(id, (net.get(id) ?? 0) - f);
        net.set(e.to, (net.get(e.to) ?? 0) + f);
        addP(pWeight, pTarget, e.to, node.pressure, cond.get(e.id)!);
      }
      continue;
    }
    for (const e of graph.outgoingEdges(id)) {
      const c = cond.get(e.id)!, dn = graph.nodes.get(e.to)!;
      const f = Math.max(0, c * (node.pressure - dn.pressure) * P_SCALE);
      net.set(id, (net.get(id) ?? 0) - f);
      net.set(e.to, (net.get(e.to) ?? 0) + f);
      addP(pWeight, pTarget, e.to, node.pressure, c);
    }
  }

  for (const n of graph.nodes.values()) {
    if (n.kind === 'source') continue;
    const target = pWeight.has(n.id) ? pTarget.get(n.id)! / pWeight.get(n.id)! : n.pressure;
    n.pressure += (target - n.pressure) * Math.min(P_LAG * dt, 1);
    if (n.kind === 'sink') n.pressure *= 1 - SINK_BLEED * dt;
  }

  const liqFrac = options.sourceLiquidFraction ?? 0.1, sandFrac = options.sourceSandFraction ?? 0.01;
  for (const n of graph.nodes.values()) {
    if (n.kind !== 'vessel') continue;
    const netFlow = net.get(n.id) ?? 0, inFlow = Math.max(0, netFlow), outFlow = Math.max(0, -netFlow);
    const slug = options.slug && options.slug.targetTag === n.tag ? options.slug.liquidFlow : 0;
    n.liquidLevel = clamp(n.liquidLevel + ((inFlow * liqFrac + slug) - outFlow * clamp(n.liquidLevel / n.volume)) * dt / n.volume, 0, n.volume);
    n.sandLevel = clamp(n.sandLevel + (inFlow * sandFrac - outFlow * clamp(n.sandLevel / n.volume)) * dt / n.volume, 0, n.volume);
  }

  if (options.loops && options.alarmRules && options.activeAlarms) {
    const alarms = evaluateAlarms(graph, options.alarmRules, options.activeAlarms, t);
    options.activeAlarms.length = 0;
    options.activeAlarms.push(...alarms);
  }

  return audit;
}

function effectiveC(edge: PlantEdge, valves: Map<string, Valve>): number {
  if (edge.kind === 'pipe') return 1;
  const v = edge.valveTag ? valves.get(edge.valveTag) : undefined;
  return v ? Math.max(0, v.position * (1 - v.leakage)) : 0;
}

function addP(w: Map<string, number>, t: Map<string, number>, id: string, p: number, c: number): void {
  w.set(id, (w.get(id) ?? 0) + c);
  t.set(id, (t.get(id) ?? 0) + p * c);
}
