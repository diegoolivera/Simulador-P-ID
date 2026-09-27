import { useSimulationStore } from '../stores/simulationStore';

export function LoopPanel() {
  const { loops, setLoopMode, setLoopSetpoint } = useSimulationStore();
  return (
    <div aria-label="Control loops" style={{ padding: 10, background: 'var(--bg-panel-elevated)', border: '1px solid var(--border-panel)', borderRadius: 6 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--text-primary)' }}>Lazos de control</h3>
      {loops.map((loop) => (
        <div key={loop.tag} style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{loop.tag} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>({loop.kind})</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <span>PV <span style={{ color: 'var(--text-primary)', fontFamily: 'Consolas, monospace' }}>{loop.processVariable.toFixed(1)}</span></span>
            <span>OUT <span style={{ color: 'var(--text-primary)', fontFamily: 'Consolas, monospace' }}>{loop.output.toFixed(2)}</span></span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>SP<input type="number" value={loop.setpoint} onChange={(e) => setLoopSetpoint(loop.tag, Number(e.target.value))} style={{ width: 56, background: 'var(--bg-canvas)', border: '1px solid var(--border-panel)', color: 'var(--text-primary)', borderRadius: 4, padding: 2 }} /></label>
            <button className={loop.mode === 'AUTO' ? 'primary' : undefined} onClick={() => setLoopMode(loop.tag, loop.mode === 'AUTO' ? 'MAN' : 'AUTO')}>{loop.mode}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
