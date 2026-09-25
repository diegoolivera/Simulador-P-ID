export type PlantNodeKind = 'source' | 'vessel' | 'sink' | 'junction';

export type PlantEdgeKind = 'pipe' | 'valved' | 'control';

export type ValveType = 'onoff' | 'control';

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
  inletIds: string[];
  outletIds: string[];
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
}

export interface Loop {
  id: string;
  tag: string;
  kind: LoopKind;
  setpoint: number;
  mode: LoopMode;
  output: number;
  processVariable: number;
  integral: number;
}

export interface Alarm {
  id: string;
  tag: string;
  description: string;
  priority: AlarmPriority;
  active: boolean;
  acknowledged: boolean;
  shelvedUntil?: number;
}
