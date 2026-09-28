export type PlantTemplate = 'basic' | 'medium' | 'complex';

/**
 * Subsystems the simulation can step. `process` is the Phase 1 separation train;
 * every other id maps to one utility/auxiliary system in the engine.
 */
export type PlantSystem =
  | 'process'
  | 'instrumentAir'
  | 'coolingWater'
  | 'fuelGas'
  | 'electrical'
  | 'pia'
  | 'teg';

/** Canonical list of every subsystem the simulator knows how to step. */
export const PLANT_SYSTEMS: PlantSystem[] = [
  'process',
  'instrumentAir',
  'coolingWater',
  'fuelGas',
  'electrical',
  'pia',
  'teg',
];

export interface TemplateLayoutItem {
  x: number;
  y: number;
  rotation: number;
  symbol: string;
  /** Optional render scale for the symbol; defaults to 1. */
  scale?: number;
}

export interface Template {
  id: PlantTemplate;
  name: string;
  description: string;
  viewBox: { width: number; height: number };
  /**
   * Subsystems the simulator steps (and raises alarms for) while this template
   * is active. Anything not listed is treated as ABSENT/healthy: it is neither
   * stepped nor evaluated, so it can never raise an alarm for a symbol that is
   * not even on screen.
   */
  systems: PlantSystem[];
  items: Record<string, TemplateLayoutItem>;
}

const baseItems: Record<string, TemplateLayoutItem> = {
  'WELL-1': { x: 80, y: 120, rotation: 0, symbol: 'well' },
  'WELL-2': { x: 160, y: 120, rotation: 0, symbol: 'well' },
  'WELL-3': { x: 240, y: 120, rotation: 0, symbol: 'well' },
  'MANIFOLD': { x: 80, y: 320, rotation: 0, symbol: 'manifold' },
  'SB-009': { x: 235, y: 320, rotation: 0, symbol: 'desander' },
  'SB-001': { x: 480, y: 320, rotation: 0, symbol: 'slug-catcher-vessel' },
  'V-6505': { x: 800, y: 370, rotation: 0, symbol: 'separator' },
  'SB-004': { x: 1150, y: 370, rotation: 0, symbol: 'scrubber' },
  'KG-31': { x: 1400, y: 370, rotation: 0, symbol: 'compressor' },
  'COMPRESSION': { x: 1650, y: 370, rotation: 0, symbol: 'sink' },
  'TC-11': { x: 1500, y: 620, rotation: 0, symbol: 'vessel' },
  'TC-12': { x: 1800, y: 620, rotation: 0, symbol: 'vessel' },
  'SALES-GAS': { x: 2050, y: 620, rotation: 0, symbol: 'sink' },
  'FLARE-HEADER': { x: 950, y: 750, rotation: 0, symbol: 'flame' },
  'TK-001': { x: 800, y: 650, rotation: 0, symbol: 'tank' },
  'TK-004': { x: 1150, y: 650, rotation: 0, symbol: 'tank' },
  'ST-002': { x: 1300, y: 820, rotation: 0, symbol: 'tank' },
  'ST-003': { x: 1600, y: 820, rotation: 0, symbol: 'tank' },
  'TKAG-41': { x: 1900, y: 820, rotation: 0, symbol: 'tank' },
  'TKAG-42': { x: 2200, y: 820, rotation: 0, symbol: 'tank' },
  'DISPATCH': { x: 2500, y: 820, rotation: 0, symbol: 'sink' },
  'DRAIN-PIT': { x: 1350, y: 750, rotation: 0, symbol: 'sink' },
  'V-IN-009': { x: 170, y: 320, rotation: 90, symbol: 'valve' },
  'V-OUT-009': { x: 360, y: 320, rotation: 90, symbol: 'valve' },
  // Valve positions sit ON the straight run of the edge that names them, so the
  // pipe routed through the glyph (see components/edgeRouting.ts) reads as one
  // natural line instead of a kinked detour.
  'BYP-009': { x: 290, y: 320, rotation: 0, symbol: 'valve' },
  'DR-009': { x: 289, y: 341, rotation: 90, symbol: 'valve' },
  'V-IN-001': { x: 405, y: 320, rotation: 90, symbol: 'valve' },
  'V-OUT-001': { x: 573, y: 335, rotation: 90, symbol: 'valve' },
  'BYP-001': { x: 642, y: 356, rotation: 0, symbol: 'valve' },
  'PV-6505': { x: 940, y: 370, rotation: 90, symbol: 'valve' },
  'BDV-6505': { x: 838, y: 465, rotation: 90, symbol: 'valve' },
  'PSV-6505AD/BD': { x: 883, y: 579, rotation: 90, symbol: 'valve' },
  'LV-6505': { x: 800, y: 520, rotation: 90, symbol: 'valve' },
  'SDV-001B': { x: 869, y: 663, rotation: 90, symbol: 'valve' },
  'V-IN-004': { x: 710, y: 356, rotation: 90, symbol: 'valve' },
  // Series chain on the SB-004 outlet, drawn left to right:
  // SDV-OUT-004 -> SB-004-OUT -> SDV-031A.
  'SB-004-OUT': { x: 1280, y: 370, rotation: 0, symbol: 'junction' },
  'SDV-031A': { x: 1340, y: 370, rotation: 90, symbol: 'valve' },
  'SDV-032A': { x: 1510, y: 370, rotation: 90, symbol: 'valve' },
  'BDV-031B': { x: 1288, y: 465, rotation: 90, symbol: 'valve' },
  'FV-185': { x: 1459, y: 517, rotation: 90, symbol: 'valve' },
  'SDV-11OUT': { x: 1620, y: 620, rotation: 90, symbol: 'valve' },
  'FV-186': { x: 1656, y: 530, rotation: 90, symbol: 'valve' },
  'SDV-12OUT': { x: 1920, y: 620, rotation: 90, symbol: 'valve' },
  'SDV-OUT-004': { x: 1210, y: 370, rotation: 90, symbol: 'valve' },
  'BYP-004': { x: 1592, y: 368, rotation: 0, symbol: 'valve' },
  'VT-004': { x: 1100, y: 465, rotation: 90, symbol: 'valve' },
  'LV-004': { x: 1150, y: 520, rotation: 90, symbol: 'valve' },
  'XV-004D': { x: 1230, y: 690, rotation: 90, symbol: 'valve' },
  'LV-11LIQ': { x: 1450, y: 670, rotation: 90, symbol: 'valve' },
  'LV-12LIQ': { x: 1750, y: 670, rotation: 90, symbol: 'valve' },
  'LV-KG31LIQ': { x: 1362, y: 542, rotation: 90, symbol: 'valve' },
  'LV-002': { x: 1450, y: 820, rotation: 90, symbol: 'valve' },
  'LV-003': { x: 1750, y: 820, rotation: 90, symbol: 'valve' },
  'BA-051': { x: 2020, y: 820, rotation: 90, symbol: 'pump' },
  'BA-052': { x: 2320, y: 820, rotation: 90, symbol: 'pump' },
  'PT-009': { x: 300, y: 220, rotation: 0, symbol: 'transmitter' },
  'ΔP-009': { x: 300, y: 260, rotation: 0, symbol: 'transmitter' },
  'PT-001': { x: 480, y: 220, rotation: 0, symbol: 'transmitter' },
  'PT-6505': { x: 910, y: 300, rotation: 0, symbol: 'transmitter' },
  'FT-6505': { x: 862, y: 215, rotation: 0, symbol: 'transmitter' },
  'LT-6505': { x: 910, y: 420, rotation: 0, symbol: 'transmitter' },
  'PT-004': { x: 1240, y: 360, rotation: 0, symbol: 'transmitter' },
  'ΔP-004': { x: 1240, y: 300, rotation: 0, symbol: 'transmitter' },
  'LT-004': { x: 1240, y: 420, rotation: 0, symbol: 'transmitter' },
  'PIC-6505': { x: 950, y: 240, rotation: 0, symbol: 'controller' },
  'LIC-6505': { x: 950, y: 500, rotation: 0, symbol: 'controller' },
  'LIC-004': { x: 1300, y: 500, rotation: 0, symbol: 'controller' },
};

const utilityItems: Record<string, TemplateLayoutItem> = {
  'IA-COMP-A': { x: 1300, y: 120, rotation: 0, symbol: 'compressor' },
  'IA-COMP-B': { x: 1380, y: 120, rotation: 0, symbol: 'compressor' },
  'IA-RECV': { x: 1340, y: 220, rotation: 0, symbol: 'vessel' },
  'IA-HEADER': { x: 1340, y: 320, rotation: 0, symbol: 'header' },
  'SDV-007': { x: 1270, y: 320, rotation: 90, symbol: 'valve' },
  'PT-IA-HEADER': { x: 1400, y: 320, rotation: 0, symbol: 'transmitter' },
  'PSLL-IA': { x: 1400, y: 360, rotation: 0, symbol: 'transmitter' },
  'CW-PUMP-A': { x: 100, y: 120, rotation: 0, symbol: 'pump' },
  'CW-PUMP-B': { x: 180, y: 120, rotation: 0, symbol: 'pump' },
  'CW-HEADER': { x: 140, y: 220, rotation: 0, symbol: 'header' },
  'CW-RETURN': { x: 190, y: 320, rotation: 0, symbol: 'sink' },
  'PT-CW-HEADER': { x: 200, y: 220, rotation: 0, symbol: 'transmitter' },
  'PSLL-CW': { x: 200, y: 260, rotation: 0, symbol: 'transmitter' },
  'FG-SUPPLY': { x: 80, y: 980, rotation: 0, symbol: 'source' },
  'SDV-006A': { x: 30, y: 980, rotation: 90, symbol: 'valve' },
  'SDV-026B': { x: 140, y: 980, rotation: 90, symbol: 'valve' },
  'SB-006': { x: 200, y: 980, rotation: 0, symbol: 'vessel' },
  'V-700': { x: 350, y: 980, rotation: 0, symbol: 'vessel' },
  'PCV-700': { x: 450, y: 980, rotation: 90, symbol: 'valve' },
  'FG-001': { x: 550, y: 980, rotation: 0, symbol: 'vessel' },
  'FG-REG': { x: 650, y: 980, rotation: 0, symbol: 'junction' },
  'FG-HEADER': { x: 650, y: 1080, rotation: 0, symbol: 'header' },
  'FG-PILOT': { x: 750, y: 1080, rotation: 0, symbol: 'sink' },
  'FG-FLARE': { x: 750, y: 980, rotation: 0, symbol: 'flame' },
  'FG-HEATER': { x: 650, y: 1180, rotation: 0, symbol: 'sink' },
  'PT-FG-HEADER': { x: 700, y: 1080, rotation: 0, symbol: 'transmitter' },
  'PSLL-FG': { x: 700, y: 1120, rotation: 0, symbol: 'transmitter' },
  'ZA-FG-001': { x: 600, y: 1020, rotation: 0, symbol: 'transmitter' },
  'GEN-001': { x: 1200, y: 650, rotation: 0, symbol: 'source' },
  'BUS-MAIN': { x: 1300, y: 650, rotation: 0, symbol: 'header' },
  'MCC-001': { x: 1400, y: 650, rotation: 0, symbol: 'junction' },
  'LOAD-PROC': { x: 1400, y: 750, rotation: 0, symbol: 'sink' },
  'LOAD-ESSENTIAL': { x: 1300, y: 750, rotation: 0, symbol: 'sink' },
  'PT-ELE-BUS': { x: 1360, y: 650, rotation: 0, symbol: 'transmitter' },
  'VOLT-LO-BUS': { x: 1360, y: 690, rotation: 0, symbol: 'transmitter' },
  'UF-BUS': { x: 1240, y: 690, rotation: 0, symbol: 'transmitter' },
  'OF-BUS': { x: 1240, y: 610, rotation: 0, symbol: 'transmitter' },
  'ZA-GEN-001': { x: 1200, y: 610, rotation: 0, symbol: 'transmitter' },
};

const piaItems: Record<string, TemplateLayoutItem> = {
  'PIA-SUPPLY': { x: 80, y: 1080, rotation: 0, symbol: 'source' },
  'PIA-PUMP-A': { x: 200, y: 1080, rotation: 0, symbol: 'pump' },
  'PIA-PUMP-B': { x: 280, y: 1080, rotation: 0, symbol: 'pump' },
  'PIA-FILTER': { x: 400, y: 1080, rotation: 0, symbol: 'vessel' },
  'PIA-HEADER': { x: 550, y: 1080, rotation: 0, symbol: 'header' },
  'PIA-INJ-WELL': { x: 700, y: 1080, rotation: 0, symbol: 'sink' },
  'PT-PIA-HEADER': { x: 550, y: 1030, rotation: 0, symbol: 'transmitter' },
  'PSLL-PIA-HEADER': { x: 550, y: 990, rotation: 0, symbol: 'transmitter' },
  'FT-PIA-INJ': { x: 700, y: 1030, rotation: 0, symbol: 'transmitter' },
  'FSLL-PIA-INJ': { x: 700, y: 990, rotation: 0, symbol: 'transmitter' },
  'ZA-PIA-A': { x: 200, y: 1030, rotation: 0, symbol: 'transmitter' },
  'ZA-PIA-B': { x: 280, y: 1030, rotation: 0, symbol: 'transmitter' },
};

const tegItems: Record<string, TemplateLayoutItem> = {
  'TEG-INLET': { x: 1300, y: 1080, rotation: 0, symbol: 'source' },
  'TEG-CONTACTOR': { x: 1450, y: 1080, rotation: 0, symbol: 'vessel' },
  'TEG-DRY-GAS': { x: 1650, y: 1080, rotation: 0, symbol: 'sink' },
  'TEG-RICH-PUMP': { x: 1450, y: 1180, rotation: 0, symbol: 'pump' },
  'TEG-REGEN': { x: 1600, y: 1180, rotation: 0, symbol: 'vessel' },
  'TEG-LEAN-PUMP': { x: 1750, y: 1180, rotation: 0, symbol: 'pump' },
  'TEG-LEAN-TANK': { x: 1900, y: 1180, rotation: 0, symbol: 'vessel' },
  'TAHH-TEG-DRY': { x: 1650, y: 1030, rotation: 0, symbol: 'transmitter' },
  'TALL-TEG-REGEN': { x: 1600, y: 1130, rotation: 0, symbol: 'transmitter' },
  'TAHH-TEG-REGEN': { x: 1700, y: 1130, rotation: 0, symbol: 'transmitter' },
  'LAHH-TEG-CONT': { x: 1450, y: 1030, rotation: 0, symbol: 'transmitter' },
  'ZA-TEG-CIRC': { x: 1750, y: 1130, rotation: 0, symbol: 'transmitter' },
  'ZA-TEG-REBOILER': { x: 1850, y: 1130, rotation: 0, symbol: 'transmitter' },
};

export const TEMPLATES: Record<PlantTemplate, Template> = {
  basic: {
    id: 'basic',
    name: 'Básico',
    description: 'Tren de separación Phase 1 sin utilidades.',
    viewBox: { width: 2600, height: 900 },
    systems: ['process'],
    items: baseItems,
  },
  medium: {
    id: 'medium',
    name: 'Intermedio',
    description: 'Tren de separación + utilidades (aire, agua, fuel gas, electricidad).',
    viewBox: { width: 2600, height: 900 },
    systems: ['process', 'instrumentAir', 'coolingWater', 'fuelGas', 'electrical'],
    items: { ...baseItems, ...utilityItems },
  },
  complex: {
    id: 'complex',
    name: 'Complejo',
    description: 'Tren completo + utilidades + PIA + TEG.',
    viewBox: { width: 2600, height: 1200 },
    systems: ['process', 'instrumentAir', 'coolingWater', 'fuelGas', 'electrical', 'pia', 'teg'],
    items: { ...baseItems, ...utilityItems, ...piaItems, ...tegItems },
  },
};
