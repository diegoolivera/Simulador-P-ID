import { useState } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

export function EsdDialog() {
  const { esdLevel, setEsdLevel, resetEsd } = useSimulationStore();
  const { dialog, closeDialog } = useUiStore();
  const [checklist, setChecklist] = useState(false);
  if (dialog !== 'esd') return null;
  return (
    <div aria-label="ESD dialog" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={closeDialog}>
      <div style={{ background: '#fff', padding: 16, borderRadius: 8, minWidth: 280 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>ESD Control</h2>
        <div>Current level: <strong>{esdLevel}</strong></div>
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          {[0, 1, 2, 3].map((level) => <button key={level} onClick={() => setEsdLevel(level as 0 | 1 | 2 | 3)} disabled={esdLevel === level}>ESD {level}</button>)}
        </div>
        <label style={{ display: 'block', margin: '12px 0' }}>
          <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} />
          Reset checklist complete
        </label>
        <button onClick={() => { if (resetEsd(checklist)) closeDialog(); }} disabled={esdLevel === 0 || !checklist}>Reset ESD</button>
        <button onClick={closeDialog} style={{ marginLeft: 8 }}>Close</button>
      </div>
    </div>
  );
}
