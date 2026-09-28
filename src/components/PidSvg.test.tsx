import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { PidSvg } from './PidSvg';
import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';
import { INSTRUMENT_SIGNALS } from '../data/instrumentSignals';
import { SYSTEM_TIE_INS } from '../data/systemTieIns';
import { TEMPLATES } from '../data/templates';

beforeEach(() => {
  localStorage.clear();
  useSimulationStore.getState().init();
  useUiStore.setState({ selectedTag: null, editMode: false });
  Element.prototype.scrollIntoView = vi.fn();
});

describe('PidSvg', () => {
  it('renders plant items from layout', () => {
    render(<PidSvg />);
    expect(screen.getByText('SB-001')).toBeInTheDocument();
    expect(screen.getByText('V-IN-009')).toBeInTheDocument();
  });

  it('selects a valve on click', () => {
    render(<PidSvg />);
    fireEvent.click(screen.getByText('V-IN-009'));
    expect(useUiStore.getState().selectedTag).toBe('V-IN-009');
  });

  it('scrolls to selected tag', () => {
    useUiStore.getState().selectTag('SB-001');
    render(<PidSvg />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('creates a palette valve that renders and accepts a command', () => {
    useUiStore.setState({ editMode: true });
    render(<PidSvg />);
    fireEvent.click(screen.getByText('Válvula'));

    // The store entry is what makes the glyph render...
    expect(useSimulationStore.getState().valves.has('VALVE-1')).toBe(true);
    expect(screen.getByText('VALVE-1')).toBeInTheDocument();

    // ...and what makes it commandable. Assert the command actually lands.
    let accepted = false;
    act(() => {
      accepted = useSimulationStore.getState().commandValve('VALVE-1', 0, 'manual', 'test');
    });
    expect(accepted).toBe(true);
    expect(useSimulationStore.getState().valves.get('VALVE-1')!.targetPosition).toBe(0);
  });

  it('restores a persisted valved edge as a real valved edge, not a plain pipe', () => {
    localStorage.setItem(
      'sbp-layout-complex',
      JSON.stringify({
        items: {
          'SB-001': { x: 480, y: 320, rotation: 0, symbol: 'vessel' },
          'SB-004': { x: 1150, y: 370, rotation: 0, symbol: 'vessel' },
          'V-NEW-1': { x: 800, y: 350, rotation: 0, symbol: 'valve' },
        },
        edges: [{ id: 'edge-valve-SB-001-SB-004', from: 'SB-001', to: 'SB-004', kind: 'valved', valveTag: 'V-NEW-1' }],
      })
    );
    render(<PidSvg />);

    const edge = useSimulationStore.getState().graph.edges.find((e) => e.id === 'edge-valve-SB-001-SB-004');
    expect(edge).toBeDefined();
    expect(edge!.kind).toBe('valved');
    expect(edge!.valveTag).toBe('V-NEW-1');
    expect(useSimulationStore.getState().valves.has('V-NEW-1')).toBe(true);
  });

  it('restores a legacy edge without a kind as a plain pipe', () => {
    localStorage.setItem(
      'sbp-layout-complex',
      JSON.stringify({
        items: {
          'SB-001': { x: 480, y: 320, rotation: 0, symbol: 'vessel' },
          'SB-004': { x: 1150, y: 370, rotation: 0, symbol: 'vessel' },
        },
        edges: [{ id: 'legacy-edge', from: 'SB-001', to: 'SB-004' }],
      })
    );
    render(<PidSvg />);

    const edge = useSimulationStore.getState().graph.edges.find((e) => e.id === 'legacy-edge');
    expect(edge).toBeDefined();
    expect(edge!.kind).toBe('pipe');
    expect(edge!.valveTag).toBeUndefined();
  });

  it('renders a dashed signal line for each instrument whose target is in the template', () => {
    useUiStore.setState({ template: 'complex' });
    const { container } = render(<PidSvg />);
    const items = TEMPLATES.complex.items;
    const expected = INSTRUMENT_SIGNALS.filter((s) => items[s.instrumentTag] && items[s.targetTag]).length;
    const lines = Array.from(container.querySelectorAll('[data-signal-line]'));
    expect(expected).toBeGreaterThan(0);
    expect(lines).toHaveLength(expected);
    for (const line of lines) {
      expect(line.getAttribute('stroke-dasharray')).toBeTruthy();
    }
  });

  it('skips signal lines whose instrument or target is absent from the template', () => {
    useUiStore.setState({ template: 'basic' });
    const { container } = render(<PidSvg />);
    const items = TEMPLATES.basic.items;
    const expected = INSTRUMENT_SIGNALS.filter((s) => items[s.instrumentTag] && items[s.targetTag]).length;
    const lines = container.querySelectorAll('[data-signal-line]');
    expect(lines).toHaveLength(expected);
    expect(expected).toBeGreaterThan(0);
    expect(expected).toBeLessThan(INSTRUMENT_SIGNALS.length);
  });

  it('renders a dash-dot tie-in line for each utility mapping whose endpoints are in the template', () => {
    useUiStore.setState({ template: 'complex' });
    const { container } = render(<PidSvg />);
    const items = TEMPLATES.complex.items;
    const expected = SYSTEM_TIE_INS.filter((t) => items[t.fromTag] && items[t.toTag]).length;
    const lines = Array.from(container.querySelectorAll('[data-tie-in-line]'));
    expect(expected).toBeGreaterThan(0);
    expect(lines).toHaveLength(expected);
    for (const line of lines) {
      expect(line.querySelector('line')?.getAttribute('stroke-dasharray')).toBe('12 4 2 4');
    }
  });

  it('skips tie-in lines whose endpoints are absent from the template', () => {
    useUiStore.setState({ template: 'basic' });
    const { container } = render(<PidSvg />);
    const items = TEMPLATES.basic.items;
    const expected = SYSTEM_TIE_INS.filter((t) => items[t.fromTag] && items[t.toTag]).length;
    expect(container.querySelectorAll('[data-tie-in-line]')).toHaveLength(expected);
    expect(expected).toBe(0);
  });

  it('renders the zoom controls and resets the readout to 100%', () => {
    render(<PidSvg />);
    expect(screen.getByLabelText('Controles de zoom')).toBeInTheDocument();
    expect(screen.getByLabelText('Nivel de zoom')).toHaveTextContent('100%');

    fireEvent.click(screen.getByLabelText('Acercá'));
    expect(screen.getByLabelText('Nivel de zoom')).not.toHaveTextContent('100%');

    fireEvent.click(screen.getByLabelText('Ajustá a pantalla'));
    expect(screen.getByLabelText('Nivel de zoom')).toHaveTextContent('100%');
  });
});
