import { describe, expect, it } from 'vitest';
import { SAFETY_TAGS } from './safetyTags';

describe('SAFETY_TAGS', () => {
  it('protects every alarm source tag', () => {
    // Removing SB-001 makes evaluateAlarmRules skip PAH-001, which silently
    // disarms the PAH-001 -> SDV-026B interlock too.
    expect(SAFETY_TAGS.has('SB-001')).toBe(true);
    expect(SAFETY_TAGS.has('V-6505')).toBe(true);
    expect(SAFETY_TAGS.has('ST-002')).toBe(true);
  });

  it('protects every ESD action target', () => {
    expect(SAFETY_TAGS.has('V-IN-009')).toBe(true); // CLOSE_ALL (ESD1)
    expect(SAFETY_TAGS.has('BDV-6505')).toBe(true); // VENT (ESD1)
    expect(SAFETY_TAGS.has('SDV-OUT-004')).toBe(true); // ESD3
  });

  it('protects interlock causes and targets', () => {
    expect(SAFETY_TAGS.has('PAH-001')).toBe(true);
    expect(SAFETY_TAGS.has('SDV-026B')).toBe(true);
  });

  it('protects the valves their consumers default to open or safe', () => {
    // fuelGas.ts: `(valves.get('SDV-006A')?.position ?? 1) > 0.05`
    // fuelGas.ts / simulationStore.ts: `pcv700 ? ... : true`
    // simulationStore.ts: `sdv007 ? ... : false`  (false === air still OK)
    expect(SAFETY_TAGS.has('SDV-006A')).toBe(true);
    expect(SAFETY_TAGS.has('PCV-700')).toBe(true);
    expect(SAFETY_TAGS.has('SDV-007')).toBe(true);
  });

  it('leaves an ordinary control valve deletable', () => {
    expect(SAFETY_TAGS.has('PV-6505')).toBe(false);
    expect(SAFETY_TAGS.has('LV-6505')).toBe(false);
  });
});
