import { beforeAll, describe, expect, it } from 'vitest';
import { useSimulationStore } from '../stores/simulationStore';
import { useScenarioStore } from '../stores/scenarioStore';

/**
 * Fase C: PIC-6505 pressure control must actually modulate at baseline (the
 * PIC/FIC pair sits on a near-neutral family without a pressure anchor, so
 * createLoop pre-loads initialOutput to the design point) and must track a
 * setpoint step with bounded overshoot.
 */
beforeAll(() => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().loadScenario('normal-operation');
  useSimulationStore.getState().setRunning(true);
  for (let i = 0; i < 600; i += 1) useSimulationStore.getState().tick(1);
}, 60_000);

const pic = () => useSimulationStore.getState().loops.find((l) => l.tag === 'PIC-6505')!;
const pv = () => useSimulationStore.getState().graph.nodes.get('V-6505')!.pressure;

describe('PIC-6505 baseline (Fase C)', () => {
  it('holds V-6505 at SP 89 with the controller modulating (not pegged)', () => {
    expect(pv()).toBeGreaterThanOrEqual(88);
    expect(pv()).toBeLessThanOrEqual(90);
    expect(pic().output).toBeGreaterThan(0.05);
    expect(pic().output).toBeLessThan(0.9);
  });
});

describe('PIC-6505 setpoint step 89 -> 95', () => {
  it('settles on the new SP with bounded overshoot', () => {
    useSimulationStore.getState().setLoopSetpoint('PIC-6505', 95);
    let peak = 0;
    for (let i = 0; i < 300; i += 1) {
      useSimulationStore.getState().tick(1);
      peak = Math.max(peak, pv());
    }
    expect(pv()).toBeGreaterThanOrEqual(94.7);
    expect(pv()).toBeLessThanOrEqual(95.3);
    // Overshoot stays under 1 kg/cm2 and never dips below the old baseline.
    expect(peak).toBeLessThanOrEqual(96);
    expect(peak).toBeGreaterThanOrEqual(95);
  }, 60_000);
});
