import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

const PRIORITY_CLASS: Record<string, string> = { CRITICAL: '#dc2626', HIGH: '#ea580c', LOW: '#ca8a04' };

export function AlarmBanner() {
  const { activeAlarms, acknowledgeAlarm, shelveAlarm, t } = useSimulationStore();
  const { selectTag } = useUiStore();
  const visible = activeAlarms.filter((a) => a.active && (a.shelvedUntil ?? 0) <= t);
  return (
    <div aria-label="Alarms" style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa', maxHeight: 120, overflow: 'auto' }}>
      <div style={{ padding: '4px 8px', fontWeight: 'bold', color: '#7c2d12' }}>Alarms ({visible.length})</div>
      {visible.length === 0 ? <div style={{ padding: '4px 8px', color: '#57534e' }}>No active alarms</div> : visible.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderTop: '1px solid #fed7aa' }}>
          <span style={{ color: PRIORITY_CLASS[a.priority], fontWeight: 'bold', minWidth: 64 }}>{a.priority}</span>
          <button onClick={() => selectTag(a.tag)} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: '#1c1917' }}>{a.tag} — {a.description} ({a.processValue.toFixed(1)} / {a.threshold})</button>
          <button onClick={() => acknowledgeAlarm(a.tag)} disabled={a.acknowledged}>{a.acknowledged ? 'Acked' : 'Ack'}</button>
          {a.priority !== 'CRITICAL' && <button onClick={() => shelveAlarm(a.tag, 30)}>Shelve</button>}
        </div>
      ))}
    </div>
  );
}
