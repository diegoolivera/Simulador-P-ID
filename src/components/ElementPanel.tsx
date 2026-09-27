import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';
import { getElementDoc } from '../data/elementDocs';

export function ElementPanel() {
  const { selectedTag, selectTag } = useUiStore();
  const { valves, activeAlarms, commandValve, lockValve, acknowledgeAlarm } = useSimulationStore();

  if (!selectedTag) {
    return (
      <div style={{ padding: 12, color: 'var(--text-secondary)', fontSize: 13 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--text-primary)' }}>Elemento</h3>
        <p style={{ margin: 0 }}>Hacé clic sobre cualquier elemento del P&ID para ver su información, uso, herramientas y alarmas.</p>
      </div>
    );
  }

  const doc = getElementDoc(selectedTag);
  const valve = valves.get(selectedTag);
  const alarms = activeAlarms.filter((a) => a.tag === selectedTag);

  return (
    <div style={{ padding: 12, fontSize: 13, color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)', fontFamily: 'Consolas, monospace' }}>{selectedTag}</h3>
        <button onClick={() => selectTag(null)} style={{ fontSize: 12 }}>Cerrar</button>
      </div>

      <div style={{ background: 'var(--bg-panel-elevated)', borderRadius: 6, padding: 10, marginBottom: 10, border: '1px solid var(--border-panel)' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{doc.title}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 6 }}>{doc.kind}</div>
        <div style={{ marginBottom: 6 }}>{doc.description}</div>
        <div style={{ marginBottom: 4 }}><strong>Uso:</strong> {doc.usage}</div>
        <div style={{ marginBottom: 4 }}><strong>Herramienta:</strong> {doc.tool}</div>
        <div><strong>Seguridad:</strong> {doc.safety}</div>
      </div>

      {valve && (
        <div style={{ background: 'var(--bg-panel-elevated)', borderRadius: 6, padding: 10, marginBottom: 10, border: '1px solid var(--border-panel)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Estado de válvula</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, marginBottom: 8 }}>
            <span>Posición:</span><span>{(valve.position * 100).toFixed(0)}%</span>
            <span>Objetivo:</span><span>{(valve.targetPosition * 100).toFixed(0)}%</span>
            <span>Tipo:</span><span>{valve.type}</span>
            <span>Fail:</span><span>{valve.failPosition}</span>
            <span>Bloqueo:</span><span>{valve.locked ? 'LOTO' : 'Libre'}</span>
            <span>Prioridad:</span><span>{valve.lastPriority}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="primary" onClick={() => commandValve(selectedTag, valve.targetPosition > 0.5 ? 0 : 1, 'manual', 'SCADA operator')}>
              {valve.targetPosition > 0.5 ? 'Cerrar' : 'Abrir'}
            </button>
            <button onClick={() => lockValve(selectedTag, !valve.locked, valve.locked ? 'Remove LOTO' : 'Apply LOTO')}>
              {valve.locked ? 'Quitar LOTO' : 'Aplicar LOTO'}
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-panel-elevated)', borderRadius: 6, padding: 10, border: '1px solid var(--border-panel)' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Alarmas activas</div>
        {alarms.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Sin alarmas activas para este elemento.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {alarms.map((a) => (
              <div key={a.id} style={{ padding: 8, borderRadius: 4, background: a.priority === 'CRITICAL' ? 'rgba(239,68,68,0.15)' : a.priority === 'HIGH' ? 'rgba(245,158,11,0.15)' : 'rgba(96,165,250,0.15)', borderLeft: `4px solid ${a.priority === 'CRITICAL' ? 'var(--alarm-critical)' : a.priority === 'HIGH' ? 'var(--alarm-high)' : 'var(--alarm-low)'}` }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{a.description}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>PV: {a.processValue.toFixed(2)} | Límite: {a.threshold.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Prioridad: {a.priority}</div>
                <button onClick={() => acknowledgeAlarm(a.tag)} style={{ marginTop: 6, fontSize: 11 }}>Reconocer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {doc.commonAlarms.length > 0 && (
        <div style={{ marginTop: 10, background: 'var(--bg-panel-elevated)', borderRadius: 6, padding: 10, border: '1px solid var(--border-panel)' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Alarmas típicas y resolución</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
            {doc.commonAlarms.map((alarm, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{alarm.code ? `${alarm.code}: ` : ''}{alarm.cause}</strong>
                <div>→ {alarm.resolution}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
