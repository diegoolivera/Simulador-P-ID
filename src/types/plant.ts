export type PlantNodeKind = 'source' | 'vessel' | 'sink' | 'junction' | 'header';

export type PlantEdgeKind = 'pipe' | 'valved' | 'control';

export type ValveType = 'manual' | 'control' | 'sdv' | 'bdv' | 'psv';

export type FailPosition = 'FC' | 'FO' | 'FL';

export type CommandPriority =
  | 'loto'
  | 'esd'
  | 'interlock'
  | 'auto'
  | 'manual';

export type LoopKind = 'PIC' | 'LIC' | 'FIC';

export type LoopMode = 'AUTO' | 'MAN';

export type AlarmPriority = 'LOW' | 'HIGH' | 'CRITICAL';

export interface PlantNode {
  id: string;
  tag: string;
  kind: PlantNodeKind;
  pressure: number;
  liquidLevel: number;
  sandLevel: number;
  volume: number;
  separationEfficiency: number;
  demisterDP: number;
  fouling: number;
  gasFlow: number;
  liquidFlow: number;
  inletIds: string[];
  outletIds: string[];
  /** Optional compressor head added to upstream pressure (kg/cm2). */
  boost?: number;
  /** Liquid drain rate (1/day) through liquid lines; physics defaults to LIQ_DRAIN_K. */
  drainK?: number;
  /** Liquid generated per sm3 gas processed (condensation/rich-glycol pickup in contactors). */
  condensateK?: number;
}

export interface PlantEdge {
  id: string;
  from: string;
  to: string;
  kind: PlantEdgeKind;
  conductance: number;
  valveTag?: string;
}

export interface Valve {
  id: string;
  tag: string;
  type: ValveType;
  failPosition: FailPosition;
  strokeTime: number;
  position: number;
  targetPosition: number;
  locked: boolean;
  lastPriority: CommandPriority;
  leakage: number;
}

export interface Loop {
  id: string;
  tag: string;
  kind: LoopKind;
  /**
   * Controller action: 'direct' raises output when PV is below setpoint
   * (inlet valves: opening raises PV); 'reverse' raises output when PV is
   * above setpoint (drain/throttle valves: opening lowers PV).
   */
  action: 'direct' | 'reverse';
  setpoint: number;
  mode: LoopMode;
  output: number;
  processVariable: number;
  integral: number;
  kp: number;
  ki: number;
  outputMin: number;
  outputMax: number;
  valveTag: string;
  pvNodeTag: string;
  pvField: 'pressure' | 'liquidLevel' | 'gasFlow';
}

export interface Alarm {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
  active: boolean;
  acknowledged: boolean;
  shelvedUntil?: number;
  t: number;
  processValue: number;
  threshold: number;
}

export interface AuditEvent {
  t: number;
  source: 'valve' | 'esd' | 'loop' | 'operator' | 'interlock';
  tag: string;
  field: string;
  from: number | string;
  to: number | string;
  reason?: string;
}
