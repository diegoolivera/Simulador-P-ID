import { useState } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { useEvalStore } from '../stores/evalStore';

type Vessel = 'SB-009' | 'SB-001' | 'SB-004';
interface LotoConfig { nodeTag: Vessel; block: string[]; bypass: string; vents: string[]; drains: string[]; }

const CFG: Record<Vessel, LotoConfig> = {
  'SB-009': { nodeTag: 'SB-009', block: ['V-IN-009', 'V-OUT-009'], bypass: 'BYP-009', vents: [], drains: ['DR-009'] },
  'SB-001': { nodeTag: 'SB-001', block: ['V-IN-001', 'V-OUT-001'], bypass: 'BYP-001', vents: ['BDV-6505'], drains: ['LV-6505'] },
  'SB-004': { nodeTag: 'SB-004', block: ['V-IN-004', 'SDV-OUT-004'], bypass: 'BYP-004', vents: ['VT-004'], drains: ['LV-004'] },
};

export function LotoWizard({ initialVessel = 'SB-001' }: { initialVessel?: Vessel }) {
  const [vessel, setVessel] = useState<Vessel>(initialVessel);
  const { graph, valves, commandValve, lockValve, t } = useSimulationStore();
  const { record } = useEvalStore();
  const cfg = CFG[vessel];
  const bypassOpen = (valves.get(cfg.bypass)?.targetPosition ?? 0) >= 0.95;
  const blocksClosed = cfg.block.every((tag) => (valves.get(tag)?.targetPosition ?? 1) <= 0.05);
  const pressure = graph.nodes.get(cfg.nodeTag)?.pressure ?? 999;
  const canLock = blocksClosed && pressure <= 0.5;
  const log = (step: string, from: string | number, to: string | number) =>
    record([{ t, source: 'operator', tag: `LOTO-${vessel}`, field: `LOTO-${vessel}-${step}`, from, to, reason: `LOTO ${vessel} ${step}` }]);
  const move = (tag: string, target: number, step: string) => {
    if (commandValve(tag, target, 'manual', `LOTO ${step}`)) log(step, target ? 0 : 1, target);
  };
  const lock = () => {
    cfg.block.forEach((tag) => { if (lockValve(tag, true, 'LOTO lock')) log('lock', 'unlocked', 'locked'); });
    log('complete', 'pending', 'complete');
  };
  return (
    <div aria-label="LOTO wizard">
      <h2>LOTO {vessel}</h2>
      <select value={vessel} onChange={(e) => setVessel(e.target.value as Vessel)} aria-label="Select vessel">
        {Object.keys(CFG).map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <div>1. Bypass <button onClick={() => move(cfg.bypass, 1, 'bypass')} disabled={bypassOpen}>Open {cfg.bypass}</button></div>
      <div>
        2. Block valves
        {cfg.block.map((tag) => <button key={tag} onClick={() => move(tag, 0, 'block')} disabled={!bypassOpen || (valves.get(tag)?.targetPosition ?? 1) <= 0.05}>Close {tag}</button>)}
      </div>
      <div>
        3. Vent/drain
        {cfg.vents.map((tag) => <button key={tag} onClick={() => move(tag, 1, 'vent')} disabled={!blocksClosed}>Open vent {tag}</button>)}
        {cfg.drains.map((tag) => <button key={tag} onClick={() => move(tag, 1, 'drain')} disabled={!blocksClosed}>Open drain {tag}</button>)}
      </div>
      <div>4. Lock <span>Pressure: {pressure.toFixed(2)}</span> <button onClick={lock} disabled={!canLock}>Apply locks</button></div>
    </div>
  );
}
