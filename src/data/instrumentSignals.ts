/**
 * Instrument signal mapping for the P&ID.
 *
 * Each entry is an ANNOTATION between a field instrument bubble and the
 * equipment node it monitors. It is deliberately NOT a PlantEdge: a signal line
 * never enters `PlantGraph.edges`, never affects physics, flow, pressure,
 * alarms, or the topological sort in `engine/physics.ts`. `PidSvg` renders the
 * mapping as a separate dashed layer, so the lines follow their items when an
 * operator drags them.
 *
 * Targets were resolved from the real model data, in priority order:
 *   1. `engine/loops.ts` `pvNodeTag` for every PIC/LIC/FIC.
 *   2. `engine/alarms.ts` `sourceTag` and the utility alarm evaluators
 *      (`instrumentAir`/`coolingWater`/`fuelGas`/`electrical`/`pia`/`teg`)
 *      for switches and transmitters that drive them.
 *   3. The loop-number suffix convention matched against the real node tags of
 *      `data/phase1.ts`, `data/phase2.ts` and `data/phase3.ts` for plain
 *      transmitters (e.g. `PT-6505` -> `V-6505`).
 *
 * The legacy prototype (`simulador-base-v1.html`, `storbrain.md`) used
 * 101-numbering for SB-001 (`PIC-101` -> `SB-001`). The modern templates use
 * the `SB-*`/`V-*` tags, so every entry below is resolved against the tags that
 * actually exist in the current graphs. An instrument that cannot be resolved
 * to a real node is intentionally left out rather than given an invented target.
 */
export interface InstrumentSignal {
  instrumentTag: string;
  targetTag: string;
}

export const INSTRUMENT_SIGNALS: InstrumentSignal[] = [
  // Phase 1 process train (base template).
  { instrumentTag: 'PT-009', targetTag: 'SB-009' },
  { instrumentTag: 'ΔP-009', targetTag: 'SB-009' },
  { instrumentTag: 'PT-001', targetTag: 'SB-001' },
  { instrumentTag: 'PT-6505', targetTag: 'V-6505' },
  { instrumentTag: 'FT-6505', targetTag: 'V-6505' },
  { instrumentTag: 'LT-6505', targetTag: 'V-6505' },
  { instrumentTag: 'PT-004', targetTag: 'SB-004' },
  { instrumentTag: 'ΔP-004', targetTag: 'SB-004' },
  { instrumentTag: 'LT-004', targetTag: 'SB-004' },
  { instrumentTag: 'PIC-6505', targetTag: 'V-6505' },
  { instrumentTag: 'LIC-6505', targetTag: 'V-6505' },
  { instrumentTag: 'LIC-004', targetTag: 'SB-004' },

  // Utility systems (medium/complex templates).
  { instrumentTag: 'PT-IA-HEADER', targetTag: 'IA-HEADER' },
  { instrumentTag: 'PSLL-IA', targetTag: 'IA-HEADER' },
  { instrumentTag: 'PT-CW-HEADER', targetTag: 'CW-HEADER' },
  { instrumentTag: 'PSLL-CW', targetTag: 'CW-HEADER' },
  { instrumentTag: 'PT-FG-HEADER', targetTag: 'FG-HEADER' },
  { instrumentTag: 'PSLL-FG', targetTag: 'FG-HEADER' },
  { instrumentTag: 'ZA-FG-001', targetTag: 'FG-001' },
  { instrumentTag: 'PT-ELE-BUS', targetTag: 'BUS-MAIN' },
  { instrumentTag: 'VOLT-LO-BUS', targetTag: 'BUS-MAIN' },
  { instrumentTag: 'UF-BUS', targetTag: 'BUS-MAIN' },
  { instrumentTag: 'OF-BUS', targetTag: 'BUS-MAIN' },
  { instrumentTag: 'ZA-GEN-001', targetTag: 'GEN-001' },

  // Produced-water injection plant (complex template).
  { instrumentTag: 'PT-PIA-HEADER', targetTag: 'PIA-HEADER' },
  { instrumentTag: 'PSLL-PIA-HEADER', targetTag: 'PIA-HEADER' },
  { instrumentTag: 'FT-PIA-INJ', targetTag: 'PIA-INJ-WELL' },
  { instrumentTag: 'FSLL-PIA-INJ', targetTag: 'PIA-INJ-WELL' },
  { instrumentTag: 'ZA-PIA-A', targetTag: 'PIA-PUMP-A' },
  { instrumentTag: 'ZA-PIA-B', targetTag: 'PIA-PUMP-B' },

  // TEG dehydration unit (complex template).
  { instrumentTag: 'TAHH-TEG-DRY', targetTag: 'TEG-DRY-GAS' },
  { instrumentTag: 'TALL-TEG-REGEN', targetTag: 'TEG-REGEN' },
  { instrumentTag: 'TAHH-TEG-REGEN', targetTag: 'TEG-REGEN' },
  { instrumentTag: 'LAHH-TEG-CONT', targetTag: 'TEG-CONTACTOR' },
  { instrumentTag: 'ZA-TEG-CIRC', targetTag: 'TEG-LEAN-PUMP' },
  { instrumentTag: 'ZA-TEG-REBOILER', targetTag: 'TEG-REGEN' },
];
