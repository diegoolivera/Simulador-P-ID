import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import App from './App';
import { useSimulationStore } from './stores/simulationStore';
import { useScenarioStore } from './stores/scenarioStore';
import { useEvalStore } from './stores/evalStore';
import { useUiStore } from './stores/uiStore';

beforeEach(() => {
  act(() => {
    useSimulationStore.getState().init();
    useScenarioStore.getState().reset();
    useEvalStore.getState().startScenario();
    useUiStore.setState({ view: 'scada', selectedTag: null, dialog: null, theme: 'light', tooltip: null, editMode: false });
  });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('App', () => {
  it('renders the shell and toggles the simulation', async () => {
    render(<App />);
    expect(screen.getByText('Simulador P&ID')).toBeInTheDocument();

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

  it('tracks the store theme on the document root and toggles it from the header', async () => {
    render(<App />);
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    const toggle = screen.getByRole('button', { name: 'Oscuro' });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      fireEvent.click(toggle);
    });
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
    expect(useUiStore.getState().theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Claro' })).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('App scenario wiring', () => {
  it('boots with a scenario loaded so physics gets real boundary conditions', async () => {
    render(<App />);
    await waitFor(() => expect(useScenarioStore.getState().activeId).toBe('normal-operation'));
    expect(useScenarioStore.getState().status).toBe('running');
  });

  it('opens the LOTO wizard from the header', async () => {
    render(<App />);
    await waitFor(() => expect(useScenarioStore.getState().activeId).not.toBeNull());
    fireEvent.click(screen.getByText('LOTO'));
    expect(screen.getByLabelText('LOTO wizard')).toBeInTheDocument();
  });

  it('switches to the field-rounds and report views', async () => {
    render(<App />);
    await waitFor(() => expect(useScenarioStore.getState().activeId).not.toBeNull());
    fireEvent.click(screen.getByText('Rondas'));
    expect(screen.getByLabelText('Field rounds')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Informe'));
    expect(screen.getByLabelText('Scenario report')).toBeInTheDocument();
  });

  it('reloads the selected scenario on Reset', async () => {
    render(<App />);
    await waitFor(() => expect(useScenarioStore.getState().activeId).toBe('normal-operation'));
    const select = screen.getByLabelText('Escenario');
    fireEvent.change(select, { target: { value: 'slug-response' } });
    expect(useScenarioStore.getState().activeId).toBe('slug-response');
    fireEvent.click(screen.getByText('Reset'));
    expect(useScenarioStore.getState().activeId).toBe('slug-response');
    expect(useScenarioStore.getState().elapsed).toBe(0);
  });
});
