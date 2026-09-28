import type { PlantSystem } from './templates';

/**
 * Utility tie-in mapping for the P&ID.
 *
 * The simulation models every auxiliary system (fuel gas, instrument air,
 * cooling water, electrical, PIA, TEG) as its OWN `PlantGraph`. That is correct
 * and must not change. What the P&ID was missing is where each of those systems
 * ties into the process train, so the utilities read as disconnected islands.
 *
 * Each entry below is an ANNOTATION between a utility-side node and the process
 * node it connects to. Like `instrumentSignals.ts` it is deliberately NOT a
 * `PlantEdge`: a tie-in never enters `PlantGraph.edges`, never affects physics,
 * flow, pressure, alarms or the topological sort in `engine/physics.ts`.
 * `PidSvg` renders it as a separate dash-dot layer.
 *
 * Convention: `fromTag` is always the utility-side node, `toTag` the Phase 1
 * process node. The arrow is a drawing convention only, not a flow direction —
 * for PIA the physical water actually flows process -> utility.
 *
 * Every mapping is derived from evidence, never guesswork, in this priority
 * order:
 *   1. `storbrain.md` — the domain document.
 *   2. Engine code that reads ACROSS graphs / the store wiring.
 *   3. Nothing. A system whose tie-in point cannot be established is left out
 *      and reported as UNRESOLVED instead of being given an invented target.
 *
 * UNRESOLVED (do not invent a row for these without new evidence):
 *   - `coolingWater`: the engine models CW-PUMP-A/B -> CW-HEADER -> CW-RETURN as
 *     a standalone loop. `engine/coolingWater.ts` never reads the process graph
 *     and `stepPhysics` never consumes `coolingWaterOk` (it is declared in
 *     `PhysicsOptions` but unused), so there is no evidenced tie-in point. The
 *     task brief suggested "the compressors" (KG-31); that claim is not backed
 *     by any code or the domain document, so it is left for a human to confirm.
 *   - `pia` injection side: `engine/pia.ts` ends at the `PIA-INJ-WELL` sink, a
 *     separate water-injection well. The Phase 1 `WELL-1/2/3` nodes are
 *     *production* wells feeding the manifold, so tying them to the injection
 *     well would be physically wrong. Only the produced-water feed side is mapped.
 */
export type TieInRelation =
  /** Utility takes its feed from the process (e.g. fuel-gas plant-outlet take-off). */
  | 'takeoff'
  /** Process condition trips an automatic utility action (cause-and-effect). */
  | 'interlock'
  /** Process feed into a utility (e.g. produced water to the PIA). */
  | 'supply'
  /** Utility equipment serves/conditions the process stream. */
  | 'service';

export interface SystemTieIn {
  /** Utility-side node tag (must exist in one of the utility graphs). */
  fromTag: string;
  /** Process-side node tag (must exist in the Phase 1 graph). */
  toTag: string;
  subsystem: PlantSystem;
  relation: TieInRelation;
  /** Where the mapping came from — quoted `file:line`, never a guess. */
  evidence: string;
}

export const SYSTEM_TIE_INS: SystemTieIn[] = [
  {
    fromTag: 'FG-SUPPLY',
    toTag: 'SALES-GAS',
    subsystem: 'fuelGas',
    relation: 'takeoff',
    evidence:
      "storbrain.md:108 'Fuel gas system (toma de salida de planta)'; " +
      "data/phase2.ts:98 'SDV-006A is the plant-outlet take-off, upstream of the skid supply node'; " +
      "engine/fuelGas.ts:49 'SDV-006A: take-off from the plant outlet'. " +
      "The plant gas outlet is SALES-GAS (engine/exam.test.ts:41 reports dry gas to sales).",
  },
  {
    fromTag: 'SB-006',
    toTag: 'SB-001',
    subsystem: 'fuelGas',
    relation: 'interlock',
    evidence:
      "engine/interlock.ts:27 'SB-001 overpressure interlock closes fuel-gas take-off SDV-026B'; " +
      "engine/alarms.ts:22 PAH-001 sourceTag 'SB-001'; " +
      'data/phase2.ts:101 SDV-026B isolates FG-SUPPLY from the fuel-gas scrubber SB-006, so the ' +
      'interlock starves the skid at SB-006 (stores/simulationStore.ts:135).',
  },
  {
    fromTag: 'TEG-CONTACTOR',
    toTag: 'TC-11',
    subsystem: 'teg',
    relation: 'service',
    evidence:
      "data/phase1.ts:36 'Contactora TEG 1' (TC-11); " +
      "data/phase1.ts:37 'Contactora TEG 2' (TC-12); " +
      "storbrain.md:221 'TEG: torre contactora, reboiler 180-200 C, filtros con dP'.",
  },
  {
    fromTag: 'TEG-CONTACTOR',
    toTag: 'TC-12',
    subsystem: 'teg',
    relation: 'service',
    evidence: "data/phase1.ts:37 'Contactora TEG 2' (TC-12): the second process contactor.",
  },
  {
    fromTag: 'TEG-DRY-GAS',
    toTag: 'SALES-GAS',
    subsystem: 'teg',
    relation: 'takeoff',
    evidence:
      "engine/teg.ts:31 dryGas = TEG-DRY-GAS is the dehydrated gas output; " +
      "storbrain.md:231 'cumplir especificacion de gas de venta'; " +
      'storbrain.md:293-302 SALES_GAS_DOC (dry gas delivered to the sales line).',
  },
  {
    fromTag: 'PIA-SUPPLY',
    toTag: 'DRAIN-PIT',
    subsystem: 'pia',
    relation: 'supply',
    evidence:
      "storbrain.md:105 'Agua -> Drain pit / PIA' (produced water feeds the PIA); " +
      "storbrain.md:308 'Toma agua, la trata y la inyecta a alta presion en el yacimiento'.",
  },
  {
    fromTag: 'IA-HEADER',
    toTag: 'V-6505',
    subsystem: 'instrumentAir',
    relation: 'service',
    evidence:
      'engine/valve.ts:96-102 applyAirFailure drives every non-isolation valve to its fail position; ' +
      'engine/exam.test.ts:220 asserts PV-6505 (on V-6505) fails closed when the air header is isolated ' +
      '(stores/simulationStore.ts:282 SDV-007 is the instrument-air isolation). ' +
      'Instrument air is distributed across many actuators, so this anchors the main separator.',
  },
  {
    fromTag: 'LOAD-PROC',
    toTag: 'KG-31',
    subsystem: 'electrical',
    relation: 'service',
    evidence:
      "engine/electrical.ts:122 iaNode('LOAD-PROC', ...) is the electrical model's process load; " +
      "data/elementDocs.ts:215-226 'Motocompresor'; " +
      'data/phase1.ts:35 KG-31 is the plant motor compressor. ' +
      '(Inferred: LOAD-PROC maps to the plant motor compressor — flagged for human confirmation.)',
  },
];
