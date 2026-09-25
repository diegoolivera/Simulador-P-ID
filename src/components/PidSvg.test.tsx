import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PidSvg } from './PidSvg';
import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

beforeEach(() => {
  useSimulationStore.getState().init();
  useUiStore.setState({ selectedTag: null });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('PidSvg', () => {
  it('renders plant items from layout', () => {
    render(<PidSvg />);
    expect(screen.getByText('SB-001')).toBeInTheDocument();
    expect(screen.getByText('V-IN-009')).toBeInTheDocument();
  });

  it('commands a valve on click', () => {
    render(<PidSvg />);
    const sim = useSimulationStore.getState();
    sim.valves.get('V-IN-009')!.targetPosition = 1;
    fireEvent.click(screen.getByText('V-IN-009'));
    expect(sim.valves.get('V-IN-009')?.targetPosition).toBe(0);
  });

  it('scrolls to selected tag', () => {
    useUiStore.getState().selectTag('SB-001');
    render(<PidSvg />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
