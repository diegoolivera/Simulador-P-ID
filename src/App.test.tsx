import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useSimulationStore } from './stores/simulationStore';
import { useScenarioStore } from './stores/scenarioStore';
import { useUiStore } from './stores/uiStore';

beforeEach(() => {
  useSimulationStore.getState().init();
  useScenarioStore.getState().reset();
  useUiStore.setState({ view: 'scada', selectedTag: null, dialog: null, theme: 'light', tooltip: null });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('App', () => {
  it('renders the shell and toggles the simulation', () => {
    render(<App />);
    expect(screen.getByText('Simulador Baterista Profesional')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Start'));
    expect(useSimulationStore.getState().running).toBe(true);
    expect(screen.getByText('Stop')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Stop'));
    expect(useSimulationStore.getState().running).toBe(false);
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('opens the ESD dialog and resets the plant', () => {
    render(<App />);
    fireEvent.click(screen.getByText('ESD'));
    expect(useUiStore.getState().dialog).toBe('esd');

    useSimulationStore.getState().setEsdLevel(2);
    fireEvent.click(screen.getByText('Reset'));
    expect(useSimulationStore.getState().esdLevel).toBe(0);
  });
});
