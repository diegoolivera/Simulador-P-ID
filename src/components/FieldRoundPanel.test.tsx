import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldRoundPanel } from './FieldRoundPanel';
import { useEvalStore } from '../stores/evalStore';

beforeEach(() => useEvalStore.getState().startScenario());

describe('FieldRoundPanel', () => {
  it('records a clean round', () => {
    render(<FieldRoundPanel />);
    fireEvent.click(screen.getByLabelText('SB-001 level within limits'));
    fireEvent.click(screen.getByText('Submit round'));
    expect(useEvalStore.getState().audit.some((e) => e.field === 'ROUND-train-complete')).toBe(true);
    expect(useEvalStore.getState().violations).toHaveLength(0);
  });

  it('penalises a missed critical item', () => {
    render(<FieldRoundPanel />);
    fireEvent.click(screen.getByText('Submit round'));
    expect(useEvalStore.getState().violations.some((v) => v.id === 'round-train')).toBe(true);
  });
});
