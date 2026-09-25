import { useSimulationStore } from '../stores/simulationStore';

export function LoopPanel() {
  const { loops, setLoopMode, setLoopSetpoint } = useSimulationStore();
  return (
    <div aria-label="Control loops" style={{ padding: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
      <h3 style={{ margin: '0 0 8px' }}>Loops</h3>
      {loops.map((loop) => (
        <div key={loop.tag} style={{ marginBottom: 8, fontSize: 12 }}>
          <div style={{ fontWeight: 'bold' }}>{loop.tag} ({loop.kind})</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>PV {loop.processVariable.toFixed(1)}</span>
            <span>OUT {loop.output.toFixed(2)}</span>
            <label>SP<input type="number" value={loop.setpoint} onChange={(e) => setLoopSetpoint(loop.tag, Number(e.target.value))} style={{ width: 56, marginLeft: 4 }} /></label>
            <button onClick={() => setLoopMode(loop.tag, loop.mode === 'AUTO' ? 'MAN' : 'AUTO')}>{loop.mode}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
