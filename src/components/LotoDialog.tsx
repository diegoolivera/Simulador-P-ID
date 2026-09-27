import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';
import { LotoWizard } from './LotoWizard';

/** Modal wrapper so the LOTO wizard is reachable from the header, like the ESD dialog. */
export function LotoDialog() {
  const { dialog, closeDialog } = useUiStore();
  const { esdLevel } = useSimulationStore();
  if (dialog !== 'loto') return null;
  return (
    <div
      aria-label="LOTO dialog"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
      onClick={closeDialog}
    >
      <div
        style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', border: '1px solid var(--border-panel)', padding: 16, borderRadius: 8, minWidth: 320, maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        {esdLevel > 0 && (
          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--alarm-critical)' }}>
            ESD {esdLevel} active — isolate the unit before LOTO.
          </div>
        )}
        <LotoWizard />
        <button onClick={closeDialog} style={{ marginTop: 12 }}>
          Close
        </button>
      </div>
    </div>
  );
}
