import '@testing-library/jest-dom/vitest';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Vessel } from './Vessel';
import { EQUIPMENT_SYMBOLS } from './symbolRegistry';

/** Equipment symbols that must not reuse the generic vessel ellipse. */
const SPECIFIC_EQUIPMENT = ['slug-catcher-vessel', 'slug-catcher-fingers', 'desander', 'scrubber', 'separator'];

const renderSymbol = (symbol: string, props: Partial<ComponentProps<typeof Vessel>> = {}) => {
  const tag = props.tag ?? 'X-1';
  const { container, unmount } = render(<Vessel tag={tag} x={0} y={0} symbol={symbol} {...props} />);
  const group = container.querySelector(`[data-tag="${tag}"]`) as SVGGElement;
  return { group, unmount };
};

describe('Vessel equipment symbols', () => {
  it('draws non-empty, pairwise-distinct geometry for every equipment symbol', () => {
    const markup = new Map<string, string>();
    for (const symbol of EQUIPMENT_SYMBOLS) {
      const { group, unmount } = renderSymbol(symbol);
      const html = group.innerHTML;
      expect(html.length, `${symbol} rendered nothing`).toBeGreaterThan(0);
      markup.set(symbol, html);
      unmount();
    }
    // A shared generic glyph would collapse two entries to the same markup.
    const values = [...markup.values()];
    expect(new Set(values).size).toBe(values.length);
  });

  it('does not reuse the generic vessel ellipse for the specific equipment', () => {
    for (const symbol of SPECIFIC_EQUIPMENT) {
      const { group, unmount } = renderSymbol(symbol);
      expect(group.querySelector('ellipse'), `${symbol} reused the generic ellipse`).toBeNull();
      unmount();
    }
  });

  it('still draws the generic ellipse for the plain vessel symbol', () => {
    const { group, unmount } = renderSymbol('vessel');
    expect(group.querySelector('ellipse')).not.toBeNull();
    unmount();
  });

  it('keeps the tag label, selected accent, alarm fill, scale and pointer handlers', () => {
    const onClick = vi.fn();
    const onMouseDown = vi.fn();
    const { group, unmount } = renderSymbol('scrubber', {
      tag: 'SB-004',
      x: 10,
      y: 20,
      scale: 1.5,
      selected: true,
      alarm: true,
      onClick,
      onMouseDown,
    });

    expect(group.getAttribute('transform')).toBe('translate(10,20) scale(1.5)');
    expect(group.getAttribute('data-symbol')).toBe('scrubber');
    expect(group.textContent).toContain('SB-004');

    const shell = group.querySelector('rect') as SVGRectElement;
    expect(shell.getAttribute('stroke')).toBe('var(--accent)');
    expect(shell.getAttribute('fill')).toBe('rgba(239,68,68,0.2)');
    expect(shell.getAttribute('stroke-width')).toBe('3');

    fireEvent.click(group);
    fireEvent.mouseDown(group);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onMouseDown).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('renders a label (never a crash) for an unknown symbol', () => {
    const { group, unmount } = renderSymbol('mystery');
    expect(group).not.toBeNull();
    expect(group.textContent).toContain('X-1');
    unmount();
  });
});
