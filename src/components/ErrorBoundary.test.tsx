import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

const Bomb = () => {
  throw new Error('boom from render');
};

describe('ErrorBoundary', () => {
  it('replaces a crashed subtree with a visible message instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('boom from render');
  });

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('offers the recovery escape hatch when one is supplied', () => {
    const onRecover = vi.fn();
    render(
      <ErrorBoundary recoverLabel="Restaurar P&ID" onRecover={onRecover}>
        <Bomb />
      </ErrorBoundary>
    );
    const button = screen.getByText('Restaurar P&ID');
    fireEvent.click(button);
    expect(onRecover).toHaveBeenCalledTimes(1);
  });

  it('omits the recovery button when no escape hatch exists', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.queryByText('Restaurar P&ID')).toBeNull();
  });
});
