import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LotoWizard } from './LotoWizard';
import { useSimulationStore } from '../stores/simulationStore';
import { useEvalStore } from '../stores/evalStore';

beforeEach(() => {
  useSimulationStore.getState().init();
  useEvalStore.getState().startScenario();
});

describe('LotoWizard', () => {
  it('enforces bypass order and locks after depressurisation', () => {
    const sim = useSimulationStore.getState();
    sim.valves.get('BYP-009')!.targetPosition = 0;
    sim.valves.get('BYP-009')!.position = 0;
    sim.graph.nodes.get('SB-009')!.pressure = 0.2;
    render(<LotoWizard initialVessel="SB-009" />);
    const closeBtn = screen.getByText('Close V-IN-009') as HTMLButtonElement;
    expect(closeBtn.disabled).toBe(true);
    fireEvent.click(screen.getByText('Open BYP-009'));
    expect(closeBtn.disabled).toBe(false);
    fireEvent.click(closeBtn);
    fireEvent.click(screen.getByText('Close V-OUT-009'));
    fireEvent.click(screen.getByText('Apply locks'));
    expect(sim.valves.get('V-IN-009')?.locked).toBe(true);
    expect(useEvalStore.getState().audit.some((e) => e.field === 'LOTO-SB-009-complete')).toBe(true);
  });
});
