import { useEffect, useState } from 'react';
import { PidSvg } from './components/PidSvg';
import { AlarmBanner } from './components/AlarmBanner';
import { PiPanel } from './components/PiPanel';
import { LoopPanel } from './components/LoopPanel';
import { ElementPanel } from './components/ElementPanel';
import { TemplateSelector } from './components/TemplateSelector';
import { InputControls } from './components/InputControls';
import { EsdDialog } from './components/EsdDialog';
import { LotoDialog } from './components/LotoDialog';
import { ScenarioSelector } from './components/ScenarioSelector';
import { FieldRoundPanel } from './components/FieldRoundPanel';
import { ScenarioReport } from './components/ScenarioReport';
import { useSimulationStore } from './stores/simulationStore';
import { useScenarioStore } from './stores/scenarioStore';
import { useUiStore } from './stores/uiStore';

const DEFAULT_SCENARIO = 'normal-operation';

const VIEWS: { id: 'scada' | 'rounds' | 'report'; label: string }[] = [
  { id: 'scada', label: 'SCADA' },
  { id: 'rounds', label: 'Rondas' },
  { id: 'report', label: 'Informe' },
];

export default function App() {
  const { running, setRunning, init, tick } = useSimulationStore();
  const { openDialog, editMode, setEditMode, theme, setTheme, template, setTemplate, view, setView } = useUiStore();
  const activeId = useScenarioStore((s) => s.activeId);
  const loadScenario = useScenarioStore((s) => s.loadScenario);
  const [engineError, setEngineError] = useState<string | null>(null);

  // The plant only runs with scenario boundary conditions (source pressure/flow),
  // so every fresh boot must load a scenario or physics falls back to defaults.
  useEffect(() => {
    init();
    loadScenario(DEFAULT_SCENARIO);
  }, [init, loadScenario]);

  // Apply the theme at the document root so `:root`-level selectors (and the
  // html/body background) follow it, not just the App subtree.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      try {
        tick(1);
      } catch (err) {
        // An uncaught throw inside the timer used to freeze the plant while the
        // header kept showing the green "Running" dot. Stop and surface it.
        setRunning(false);
        setEngineError(err instanceof Error ? err.message : String(err));
      }
    }, 400);
    return () => clearInterval(id);
  }, [running, tick, setRunning]);

  const reset = () => {
    init();
    setEngineError(null);
    loadScenario(activeId ?? DEFAULT_SCENARIO);
  };

  const tabStyle = (id: string) => ({
    padding: '4px 10px',
    fontSize: 12,
    border: '1px solid var(--border-panel)',
    borderRadius: 4,
    background: view === id ? 'var(--accent)' : 'transparent',
    color: view === id ? '#fff' : 'var(--text-primary)',
  });

  return (
    <div data-theme={theme} style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 1280, minHeight: 720, overflow: 'hidden', background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      <header style={{ padding: '10px 16px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: running ? 'var(--ok)' : 'var(--alarm-critical)', boxShadow: `0 0 8px ${running ? 'var(--ok)' : 'var(--alarm-critical)'}` }} />
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: 0.5 }}>Simulador P&amp;ID</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ScenarioSelector />
          <TemplateSelector current={template} onChange={setTemplate} />
          <div style={{ display: 'flex', gap: 4 }}>
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => setView(v.id)} style={tabStyle(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--border-panel)' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={running ? undefined : 'primary'} onClick={() => setRunning(!running)}>{running ? 'Stop' : 'Start'}</button>
            <button onClick={reset}>Reset</button>
            <button onClick={() => openDialog('loto')}>LOTO</button>
            <button onClick={() => openDialog('esd')}>ESD</button>
            <button onClick={() => setEditMode(!editMode)} style={{ background: editMode ? 'var(--accent)' : undefined, color: editMode ? '#fff' : undefined, borderColor: editMode ? 'var(--accent)' : undefined }}>
              {editMode ? 'Salir de edición' : 'Editar P&ID'}
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              aria-pressed={theme === 'light'}
            >
              {theme === 'dark' ? 'Claro' : 'Oscuro'}
            </button>
          </div>
        </div>
      </header>
      <AlarmBanner />
      {engineError && (
        <div role="alert" style={{ padding: '6px 16px', background: 'var(--alarm-critical)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Simulación detenida por un error del motor: {engineError}. Hacé Reset para continuar.</span>
          <button onClick={() => setEngineError(null)} style={{ fontSize: 11 }}>Descartar</button>
        </div>
      )}
      {view === 'scada' && (
        <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-canvas)' }}>
            <PidSvg />
          </div>
          <aside style={{ width: 340, flexShrink: 0, overflow: 'auto', borderLeft: '1px solid var(--border-panel)', background: 'var(--bg-panel)', display: 'flex', flexDirection: 'column' }}>
            <ElementPanel />
            <div style={{ borderTop: '1px solid var(--border-panel)', padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InputControls />
              <PiPanel />
              <LoopPanel />
            </div>
          </aside>
        </main>
      )}
      {view === 'rounds' && (
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <FieldRoundPanel />
        </main>
      )}
      {view === 'report' && (
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <ScenarioReport />
        </main>
      )}
      <EsdDialog />
      <LotoDialog />
    </div>
  );
}
