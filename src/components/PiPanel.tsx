import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

/**
 * Reads the selected tag across every plant graph (process, utilities, PIA, TEG)
 * so the exam readouts — SALES-GAS flow, V-700 pressure, FG header — are all
 * reachable from the P&ID.
 */
export function PiPanel() {
  const { graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph } = useSimulationStore();
  const { selectedTag } = useUiStore();
  const node = selectedTag
    ? [graph, iaGraph, cwGraph, fgGraph, elGraph, piaGraph, tegGraph]
        .map((g) => g.nodes.get(selectedTag))
        .find((n) => n)
    : undefined;

  const row = (label: string, value: string) => (
    <>
      <div>{label}</div>
      <div style={{ color: 'var(--text-primary)', textAlign: 'right', fontFamily: 'Consolas, monospace' }}>{value}</div>
    </>
  );

  return (
    <div aria-label="Process values" style={{ padding: 10, background: 'var(--bg-panel-elevated)', border: '1px solid var(--border-panel)', borderRadius: 6, minWidth: 180 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-primary)' }}>{selectedTag ?? 'Sin selección'}</h3>
      {node ? (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {row('Pressure', node.pressure.toFixed(2))}
          {row('Gas flow', `${(node.gasFlow / 1000).toFixed(1)} k`)}
          {row('Liq flow', `${node.liquidFlow.toFixed(1)} m3/d`)}
          {row('Liq level', node.liquidLevel.toFixed(2))}
          {row('Sand', node.sandLevel.toFixed(2))}
          {row('Demister dP', node.demisterDP.toFixed(2))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Seleccioná un elemento en el P&ID.</div>
      )}
    </div>
  );
}
