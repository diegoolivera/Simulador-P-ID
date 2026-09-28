import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

const PRIORITY_CLASS: Record<string, string> = { CRITICAL: 'var(--alarm-critical)', HIGH: 'var(--alarm-high)', LOW: 'var(--alarm-low)' };

export function AlarmBanner() {
  const { activeAlarms, acknowledgeAlarm, shelveAlarm, t } = useSimulationStore();
  const { selectTag } = useUiStore();
  const visible = activeAlarms.filter((a) => a.active && (a.shelvedUntil ?? 0) <= t);
  return (
    <div aria-label="Alarms" style={{ background: 'var(--bg-panel-elevated)', borderBottom: '1px solid var(--border-panel)', maxHeight: 120, overflow: 'auto' }}>
      <div style={{ padding: '6px 12px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Alarmas ({visible.length})</div>
      {visible.length === 0 ? <div style={{ padding: '4px 12px', color: 'var(--text-secondary)' }}>Sin alarmas activas</div> : visible.map((a) => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', borderTop: '1px solid var(--border-panel)' }}>
          <span style={{ color: PRIORITY_CLASS[a.priority], fontWeight: 'bold', minWidth: 64 }}>{a.priority}</span>
          <button onClick={() => selectTag(a.tag)} style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)', flex: 1, fontSize: 12 }}>{a.tag} — {a.description} ({a.processValue.toFixed(1)} / {a.threshold})</button>
          <button onClick={() => acknowledgeAlarm(a.tag)} disabled={a.acknowledged}>{a.acknowledged ? 'Acked' : 'Ack'}</button>
          {a.priority !== 'CRITICAL' && <button onClick={() => shelveAlarm(a.tag, 30)}>Shelve</button>}
        </div>
      ))}
    </div>
  );
}
