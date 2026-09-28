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

/**
 * Every line that is NOT part of an item's own glyph. Process pipes, instrument
 * signal lines and utility tie-ins all draw outside the `[data-tag]` groups, so
 * excluding glyph internals leaves exactly the connection layer.
 */
const connectionLines = (container: HTMLElement): SVGLineElement[] =>
  Array.from(container.querySelectorAll('line')).filter((line) => !line.closest('[data-tag]'));

const pointKey = (p: { x: number; y: number }) => `${p.x},${p.y}`;

const lineEndpointKeys = (line: SVGLineElement): string[] =>
  [`${line.getAttribute('x1')},${line.getAttribute('y1')}`, `${line.getAttribute('x2')},${line.getAttribute('y2')}`].sort();

/** True when a connection line is drawn with exactly these two endpoints. */
const hasSegment = (container: HTMLElement, a: { x: number; y: number }, b: { x: number; y: number }): boolean => {
  const wanted = [pointKey(a), pointKey(b)].sort().join('|');
  return connectionLines(container).some((line) => lineEndpointKeys(line).join('|') === wanted);
};

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

  it('routes a valved edge through its valve item instead of a straight line past it', () => {
    useUiStore.setState({ template: 'basic' });
    const { container } = render(<PidSvg />);
    const items = TEMPLATES.basic.items;

    // `manifold-sb009` names V-IN-009 while running MANIFOLD -> SB-009.
    expect(hasSegment(container, items['MANIFOLD'], items['V-IN-009'])).toBe(true);
    expect(hasSegment(container, items['V-IN-009'], items['SB-009'])).toBe(true);
    // The old single straight line that ignored the valve must be gone.
    expect(hasSegment(container, items['MANIFOLD'], items['SB-009'])).toBe(false);
  });

  it('draws a straight pipe when a valved edge names a valve with no item in the template', () => {
    useUiStore.setState({ template: 'basic' });
    localStorage.setItem(
      'sbp-layout-basic',
      JSON.stringify({
        items: {
          DISPATCH: { ...TEMPLATES.basic.items['DISPATCH'] },
          'DRAIN-PIT': { ...TEMPLATES.basic.items['DRAIN-PIT'] },
        },
        edges: [{ id: 'ghost-valve-edge', from: 'DISPATCH', to: 'DRAIN-PIT', kind: 'valved', valveTag: 'GHOST-VALVE' }],
      })
    );
    const { container } = render(<PidSvg />);

    expect(useSimulationStore.getState().graph.edges.find((e) => e.id === 'ghost-valve-edge')?.valveTag).toBe('GHOST-VALVE');
    const items = TEMPLATES.basic.items;
    expect(hasSegment(container, items['DISPATCH'], items['DRAIN-PIT'])).toBe(true);
  });
});

/**
 * Permanent guard for the "elemento suelto" defect: every symbol in every
 * template must be attached to at least one line (a process pipe routed through
 * it, an instrument signal, or a utility tie-in). A floating valve is exactly
 * the regression this catches. There are deliberately NO declared exceptions.
 */
describe.each(['basic', 'medium', 'complex'] as const)('line coverage for the %s template', (template) => {
  it('draws every item in the template with at least one line', () => {
    useUiStore.setState({ template });
    const { container } = render(<PidSvg />);

    const endpoints = new Set<string>();
    for (const line of connectionLines(container)) {
      endpoints.add(`${line.getAttribute('x1')},${line.getAttribute('y1')}`);
      endpoints.add(`${line.getAttribute('x2')},${line.getAttribute('y2')}`);
    }

    const orphans = Object.entries(TEMPLATES[template].items)
      .filter(([, item]) => !endpoints.has(`${item.x},${item.y}`))
      .map(([tag]) => tag);
    expect(orphans).toEqual([]);
  });
});
