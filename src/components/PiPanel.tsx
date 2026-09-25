import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

export function PiPanel() {
  const { graph } = useSimulationStore();
  const { selectedTag } = useUiStore();
  const node = selectedTag ? graph.nodes.get(selectedTag) : undefined;

  return (
    <div aria-label="Process values" style={{ padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 180 }}>
      <h3 style={{ margin: '0 0 8px' }}>{selectedTag ?? 'No selection'}</h3>
      {node ? (
        <div style={{ fontSize: 13 }}>
          <div>Pressure: {node.pressure.toFixed(2)}</div>
          <div>Liquid level: {node.liquidLevel.toFixed(2)}</div>
          <div>Sand level: {node.sandLevel.toFixed(2)}</div>
          <div>Demister dP: {node.demisterDP.toFixed(2)}</div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: '#64748b' }}>Select a vessel or transmitter on the P&ID.</div>
      )}
    </div>
  );
}
