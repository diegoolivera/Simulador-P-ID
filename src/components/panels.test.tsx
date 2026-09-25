import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlarmBanner } from './AlarmBanner';
import { LoopPanel } from './LoopPanel';
import { PiPanel } from './PiPanel';
import { EsdDialog } from './EsdDialog';
import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

beforeEach(() => {
  useSimulationStore.getState().init();
  useUiStore.setState({ view: 'scada', selectedTag: null, dialog: null, theme: 'light', tooltip: null });
});

const alarm = (id: string, priority: 'HIGH' | 'LOW', desc: string, value: number, threshold: number) =>
  ({ id, tag: id, description: desc, priority, active: true, acknowledged: false, t: 0, processValue: value, threshold });

describe('AlarmBanner', () => {
  it('acknowledges and shelves alarms', () => {
    const sim = useSimulationStore.getState();
    sim.activeAlarms.push(alarm('PAH-101', 'HIGH', 'High pressure', 80, 75));
    sim.activeAlarms.push(alarm('PAL-101', 'LOW', 'Low pressure', 55, 60));
    render(<AlarmBanner />);
    fireEvent.click(screen.getAllByText('Ack')[0]);
    expect(sim.activeAlarms[0].acknowledged).toBe(true);
    fireEvent.click(screen.getAllByText('Shelve')[1]);
    expect(sim.activeAlarms[1].shelvedUntil).toBeGreaterThan(0);
  });
});

describe('LoopPanel', () => {
  it('toggles loop mode and setpoint', () => {
    render(<LoopPanel />);
    expect(screen.getByText('PIC-101 (PIC)')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('AUTO')[0]);
    expect(useSimulationStore.getState().loops[0].mode).toBe('MAN');
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '65' } });
    expect(useSimulationStore.getState().loops[0].setpoint).toBe(65);
  });
});

describe('PiPanel', () => {
  it('shows values for the selected node', () => {
    useUiStore.getState().selectTag('SB-001');
    useSimulationStore.getState().graph.nodes.get('SB-001')!.pressure = 72;
    render(<PiPanel />);
    expect(screen.getByText(/72\.00/)).toBeInTheDocument();
  });
});

describe('EsdDialog', () => {
  it('resets ESD when checklist is checked', () => {
    useUiStore.getState().openDialog('esd');
    const sim = useSimulationStore.getState();
    sim.setEsdLevel(1);
    render(<EsdDialog />);
    fireEvent.click(screen.getByLabelText('Reset checklist complete'));
    fireEvent.click(screen.getByText('Reset ESD'));
    expect(sim.esdLevel).toBe(0);
  });
});
