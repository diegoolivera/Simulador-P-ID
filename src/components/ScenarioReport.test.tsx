import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScenarioReport } from './ScenarioReport';
import { useEvalStore } from '../stores/evalStore';
import type { AuditEvent } from '../types/plant';

beforeEach(() => {
  useEvalStore.getState().startScenario();
});

const auditEvent = (tag: string, field: string, reason?: string): AuditEvent => ({
  t: 1.5,
  source: 'operator',
  tag,
  field,
  from: 0,
  to: 1,
  reason,
});

describe('ScenarioReport', () => {
  it('renders the computed score and audit log', () => {
    const store = useEvalStore.getState();
    store.record([auditEvent('V-IN-009', 'targetPosition')]);
    store.addResult({ id: 'r1', severity: 'EFFICIENCY', message: 'Minor issue' });
    render(<ScenarioReport />);
    expect(screen.getByLabelText('Scenario report')).toBeInTheDocument();
    expect(screen.getByText(/Tier: EXPERT/)).toBeInTheDocument();
    expect(screen.getByText(/Score: 90/)).toBeInTheDocument();
    expect(screen.getByText(/EFFICIENCY: Minor issue/)).toBeInTheDocument();
    expect(screen.getByText('1.5')).toBeInTheDocument();
    expect(screen.getByText('V-IN-009')).toBeInTheDocument();
  });
});
