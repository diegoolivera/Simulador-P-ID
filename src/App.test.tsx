import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import App from './App';
import { useSimulationStore } from './stores/simulationStore';
import { useScenarioStore } from './stores/scenarioStore';
import { useUiStore } from './stores/uiStore';

beforeEach(() => {
  act(() => {
    useSimulationStore.getState().init();
    useScenarioStore.getState().reset();
    useUiStore.setState({ view: 'scada', selectedTag: null, dialog: null, theme: 'light', tooltip: null });
  });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('App', () => {
  it('renders the shell and toggles the simulation', async () => {
    render(<App />);
    expect(screen.getByText('Simulador Baterista Profesional')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText('Start'));
    });
    await waitFor(() => {
      expect(useSimulationStore.getState().running).toBe(true);
    });
    expect(screen.getByText('Stop')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText('Stop'));
    });
    await waitFor(() => {
      expect(useSimulationStore.getState().running).toBe(false);
    });
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('opens the ESD dialog and resets the plant', async () => {
    render(<App />);
    act(() => {
      fireEvent.click(screen.getByText('ESD'));
    });
    await waitFor(() => {
      expect(useUiStore.getState().dialog).toBe('esd');
    });

    act(() => {
      useSimulationStore.getState().setEsdLevel(2);
    });
    act(() => {
      fireEvent.click(screen.getByText('Reset'));
    });
    await waitFor(() => {
      expect(useSimulationStore.getState().esdLevel).toBe(0);
    });
  });
});
