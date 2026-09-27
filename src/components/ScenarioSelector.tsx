import { useScenarioStore } from '../stores/scenarioStore';
import { useSimulationStore } from '../stores/simulationStore';

const STATUS_LABEL: Record<string, string> = {
  idle: 'En espera',
  running: 'En curso',
  won: 'Aprobado',
  lost: 'Reprobado',
};

/**
 * Scenario picker for the header. Switching a scenario resets the plant and
 * reloads it so the boundary conditions (source pressure/flow) and the
 * scheduled triggers always come from the selected scenario.
 */
export function ScenarioSelector() {
  const { scenarios, activeId, status, elapsed, loadScenario } = useScenarioStore();

  const select = (id: string) => {
    const wasRunning = useSimulationStore.getState().running;
    useSimulationStore.getState().init();
    loadScenario(id);
    if (wasRunning) useSimulationStore.getState().setRunning(true);
  };

  const active = activeId ? scenarios[activeId] : undefined;
  const chip =
    status === 'won' ? 'var(--ok)' : status === 'lost' ? 'var(--alarm-critical)' : 'var(--text-secondary)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select
        aria-label="Escenario"
        value={activeId ?? ''}
        onChange={(e) => e.target.value && select(e.target.value)}
        style={{ background: 'var(--bg-panel-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-panel)', borderRadius: 4, padding: '4px 6px', fontSize: 12 }}
      >
        {activeId === null && <option value="">Sin escenario</option>}
        {Object.values(scenarios).map((s) => (
          <option key={s.id} value={s.id}>
            {s.title}
          </option>
        ))}
      </select>
      <span
        title={active?.description}
        style={{ fontSize: 11, color: chip, border: `1px solid ${chip}`, borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap' }}
      >
        {STATUS_LABEL[status] ?? status}
        {active ? ` · ${Math.floor(elapsed)}/${active.duration}s` : ''}
      </span>
    </div>
  );
}
