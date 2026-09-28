import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SignalLine } from './SignalLine';

describe('SignalLine', () => {
  it('renders a dashed line so it reads as a signal, not a process pipe', () => {
    const { container } = render(
      <svg>
        <SignalLine from={{ x: 0, y: 0 }} to={{ x: 100, y: 50 }} />
      </svg>
    );
    const line = container.querySelector('line');
    expect(line).not.toBeNull();
    const dash = line!.getAttribute('stroke-dasharray');
    expect(dash, 'signal lines must be dashed').toBeTruthy();
    expect(dash).not.toBe('');
  });

  it('connects the two anchor points it is given', () => {
    const { container } = render(
      <svg>
        <SignalLine from={{ x: 10, y: 20 }} to={{ x: 30, y: 40 }} />
      </svg>
    );
    const line = container.querySelector('line')!;
    expect(line.getAttribute('x1')).toBe('10');
    expect(line.getAttribute('y1')).toBe('20');
    expect(line.getAttribute('x2')).toBe('30');
    expect(line.getAttribute('y2')).toBe('40');
  });

  it('does not intercept pointer events meant for the items it connects', () => {
    const { container } = render(
      <svg>
        <SignalLine from={{ x: 0, y: 0 }} to={{ x: 1, y: 1 }} />
      </svg>
    );
    expect(container.querySelector('line')).toHaveAttribute('pointer-events', 'none');
  });
});
