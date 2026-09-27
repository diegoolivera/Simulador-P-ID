import { beforeAll, describe, expect, it } from 'vitest';
import { useSimulationStore } from '../stores/simulationStore';
import { useScenarioStore } from '../stores/scenarioStore';
import { MAX_DEW_POINT } from './teg';

/**
 * Fase D: TEG dehydration exam behavior. Tripping the circulation pump must
 * degrade dryness (dew point rises above MAX_DEW_POINT), flood the contactor
 * (level > 85%) and raise TAHH-TEG-DRY / LAHH-TEG-CONT / ZA-TEG-CIRC alarms;
 * restoring the pump must recover the unit and clear the alarms.
 */
beforeAll(() => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().loadScenario('normal-operation');
  useSimulationStore.getState().setRunning(true);
  for (let i = 0; i < 600; i += 1) useSimulationStore.getState().tick(1);
}, 60_000);

const activeTag = (tag: string) =>
  useSimulationStore.getState().activeAlarms.some((a) => a.tag === tag && a.active);
const run = (seconds: number) => {
  for (let i = 0; i < seconds; i += 1) useSimulationStore.getState().tick(1);
};

describe('TEG unit in normal operation', () => {
  it('dehydrates gas within spec and raises no TEG alarms', () => {
    const s = useSimulationStore.getState();
    expect(s.tegState.dewPoint).toBeLessThanOrEqual(MAX_DEW_POINT);
    expect(s.tegState.tegOk).toBe(true);
    for (const tag of ['TAHH-TEG-DRY', 'LAHH-TEG-CONT', 'TALL-TEG-REGEN', 'ZA-TEG-CIRC']) {
      expect(activeTag(tag), `${tag} must be inactive`).toBe(false);
    }
  });
});

describe('circulation pump trip', () => {
  it('floods the contactor, degrades dew point and trips alarms', () => {
    useSimulationStore.getState().setScenarioOptions({ tripCirculation: true });
    run(30);

    const s = useSimulationStore.getState();
    expect(s.tegState.dewPoint).toBeGreaterThan(MAX_DEW_POINT);
    expect(s.tegState.contactorLevel).toBeGreaterThan(0.85);
    expect(s.tegState.tegOk).toBe(false);
    expect(activeTag('TAHH-TEG-DRY')).toBe(true);
    expect(activeTag('LAHH-TEG-CONT')).toBe(true);
    expect(activeTag('ZA-TEG-CIRC')).toBe(true);
    // Reboiler keeps regenerating on its own: no low-temperature alarm.
    expect(activeTag('TALL-TEG-REGEN')).toBe(false);
  }, 60_000);

  it('recovers and clears all TEG alarms once the pump is restored', () => {
    useSimulationStore.getState().setScenarioOptions({});
    run(120);

    const s = useSimulationStore.getState();
    expect(s.tegState.dewPoint).toBeLessThanOrEqual(MAX_DEW_POINT);
    expect(s.tegState.contactorLevel).toBeLessThan(0.85);
    expect(s.tegState.tegOk).toBe(true);
    for (const tag of ['TAHH-TEG-DRY', 'LAHH-TEG-CONT', 'ZA-TEG-CIRC']) {
      expect(activeTag(tag), `${tag} must clear after recovery`).toBe(false);
    }
  }, 60_000);
});
