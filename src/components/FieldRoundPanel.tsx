import { useState } from 'react';
import { useSimulationStore } from '../stores/simulationStore';
import { useEvalStore } from '../stores/evalStore';

type RoundId = 'train' | 'tanks' | 'flare';

interface Item {
  id: string;
  label: string;
  critical: boolean;
}

const ROUNDS: Record<RoundId, { title: string; items: Item[] }> = {
  train: {
    title: 'Separation train',
    items: [
      { id: 'tr-inlet', label: 'SB-009 inlet path clear', critical: false },
      { id: 'tr-level', label: 'SB-001 level within limits', critical: true },
      { id: 'tr-pressure', label: 'SB-004 pressure normal', critical: false },
    ],
  },
  tanks: {
    title: 'Tanks',
    items: [
      { id: 'tk-001-drain', label: 'TK-001 drain valve closed', critical: true },
      { id: 'tk-004-drain', label: 'TK-004 drain valve closed', critical: true },
    ],
  },
  flare: {
    title: 'Flare',
    items: [
      { id: 'fl-pilot', label: 'Flare pilot stable', critical: true },
      { id: 'fl-bdv', label: 'BDV-6505 available', critical: false },
    ],
  },
};

export function FieldRoundPanel() {
  const [active, setActive] = useState<RoundId>('train');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const { t } = useSimulationStore();
  const { record, addResult } = useEvalStore();
  const round = ROUNDS[active];

  const toggle = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const submit = () => {
    const missing = round.items.filter((i) => i.critical && !checked.has(i.id)).map((i) => i.id);
    const reason = missing.length ? `missing-critical:${missing.join(',')}` : 'ok';
    record([{ t, source: 'operator', tag: `ROUND-${active}`, field: `ROUND-${active}-complete`, from: 'pending', to: 'complete', reason }]);
    if (missing.length) addResult({ id: `round-${active}`, severity: 'PROCESS', message: `Critical item missed during ${active} round` });
    setChecked(new Set());
  };

  return (
    <div aria-label="Field rounds">
      <h2>Field Rounds</h2>
      <div>{(Object.keys(ROUNDS) as RoundId[]).map((id) => <button key={id} onClick={() => { setActive(id); setChecked(new Set()); }}>{id}</button>)}</div>
      <h3>{round.title}</h3>
      {round.items.map((item) => (
        <label key={item.id} style={{ display: 'block' }}>
          <input type="checkbox" checked={checked.has(item.id)} onChange={() => toggle(item.id)} aria-label={item.label} />
          {item.label} {item.critical ? '*' : ''}
        </label>
      ))}
      <button onClick={submit}>Submit round</button>
    </div>
  );
}
