import { useEffect } from 'react';
import { PidSvg } from './components/PidSvg';
import { AlarmBanner } from './components/AlarmBanner';
import { PiPanel } from './components/PiPanel';
import { LoopPanel } from './components/LoopPanel';
import { EsdDialog } from './components/EsdDialog';
import { useSimulationStore } from './stores/simulationStore';
import { useUiStore } from './stores/uiStore';

export default function App() {
  const { running, setRunning, init, tick } = useSimulationStore();
  const { openDialog } = useUiStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick(1), 400);
    return () => clearInterval(id);
  }, [running, tick]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 1280, minHeight: 720, overflow: 'hidden' }}>
      <header style={{ padding: '8px 12px', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>Simulador Baterista Profesional</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setRunning(!running)}>{running ? 'Stop' : 'Start'}</button>
          <button onClick={() => { init(); }}>Reset</button>
          <button onClick={() => openDialog('esd')}>ESD</button>
        </div>
      </header>
      <AlarmBanner />
      <main style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'auto', background: '#f1f5f9' }}>
          <PidSvg />
        </div>
        <aside style={{ width: 280, flexShrink: 0, overflow: 'auto', borderLeft: '1px solid #e2e8f0', background: '#fff', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PiPanel />
          <LoopPanel />
        </aside>
      </main>
      <EsdDialog />
    </div>
  );
}
