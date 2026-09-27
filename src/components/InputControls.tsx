import type { CSSProperties } from 'react';
import type { PhysicsOptions } from '../engine/physics';
import { useSimulationStore } from '../stores/simulationStore';
import { useScenarioStore } from '../stores/scenarioStore';

const WELLS = 3;
// Stable fallback: returning a fresh `{}` from a zustand selector would make
// getSnapshot return a new object every render and loop forever.
const NO_BASE: Partial<PhysicsOptions> = {};

/**
 * Operator boundary-condition controls. Values fall back to the active
 * scenario's base options so the sliders always show what the engine is
 * actually using, and only an explicit user change overrides the scenario.
 */
export function InputControls() {
  const scenarioOptions = useSimulationStore((s) => s.scenarioOptions);
  const setScenarioOptions = useSimulationStore((s) => s.setScenarioOptions);
  const base = useScenarioStore((s) => s.active?.baseOptions) ?? NO_BASE;

  const pressure = scenarioOptions.sourcePressure ?? base.sourcePressure ?? 80;
  const flow = scenarioOptions.sourceFlow ?? base.sourceFlow ?? 833_333;
  const liquidFraction = scenarioOptions.sourceLiquidFraction ?? base.sourceLiquidFraction ?? 0.02;
  const extraLoad = scenarioOptions.extraLoad ?? 0;
  const circulationRate = scenarioOptions.circulationRate ?? 1;

  const set = (field: keyof typeof scenarioOptions, value: number) => {
    setScenarioOptions({ ...scenarioOptions, [field]: value });
  };

  const label: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--text-secondary)',
  };
  const value: CSSProperties = { color: 'var(--text-primary)', fontFamily: 'Consolas, monospace' };

  return (
    <div style={{ padding: 10, background: 'var(--bg-panel-elevated)', border: '1px solid var(--border-panel)', borderRadius: 6 }}>
      <h3 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-primary)' }}>Controles de entrada</h3>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>
          <span>Presi&oacute;n de cabezal (kg/cm&sup2;)</span>
          <span style={value}>{pressure.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min={20}
          max={150}
          step={0.5}
          value={pressure}
          onChange={(e) => set('sourcePressure', Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>
          <span>Caudal por pozo (sm&sup3;/d &divide;1000)</span>
          <span style={value}>{Math.round(flow / 1000)}k &middot; {(flow * WELLS / 1_000_000).toFixed(2)} MM total</span>
        </label>
        <input
          type="range"
          min={0}
          max={1500}
          step={10}
          value={Math.round(flow / 1000)}
          onChange={(e) => set('sourceFlow', Number(e.target.value) * 1000)}
          style={{ width: '100%' }}
        />
      </div>

      <div>
        <label style={label}>
          <span>BS&amp;W (agua/condensado)</span>
          <span style={value}>{(liquidFraction * 100).toFixed(1)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={20}
          step={0.5}
          value={liquidFraction * 100}
          onChange={(e) => set('sourceLiquidFraction', Number(e.target.value) / 100)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={label}>
          <span>Carga de servicios (motogeneradores)</span>
          <span style={value}>{(extraLoad * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={extraLoad}
          onChange={(e) => set('extraLoad', Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          Más carga = más gas de servicio extraído por SDV-006A y menor P en V-700.
        </div>
      </div>

      <div>
        <label style={label}>
          <span>Recirculaci&oacute;n de glicol (TEG)</span>
          <span style={value}>{(circulationRate * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={circulationRate}
          onChange={(e) => set('circulationRate', Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
          Por debajo de ~45% el punto de rocío de TEG-DRY-GAS sale de especificación.
        </div>
      </div>
    </div>
  );
}
