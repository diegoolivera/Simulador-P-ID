import { useEffect, useMemo } from 'react';
import layout from '../data/layout.json';
import { PHASE1_ALARM_RULES } from '../engine/alarms';
import { Valve } from './Valve';
import { Vessel } from './Vessel';
import { Pipe } from './Pipe';
import { useSimulationStore } from '../stores/simulationStore';
import { useUiStore } from '../stores/uiStore';

type LayoutItem = { x: number; y: number; rotation: number; symbol: string };

export function PidSvg() {
  const { graph, valves, activeAlarms, commandValve } = useSimulationStore();
  const { selectedTag, selectTag } = useUiStore();
  const items = layout.items as Record<string, LayoutItem>;
  const sourceMap = useMemo(() => new Map(PHASE1_ALARM_RULES.map((r) => [r.id, r.sourceTag])), []);
  const alarmTags = useMemo(() => new Set(activeAlarms.map((a) => sourceMap.get(a.id) ?? a.tag)), [activeAlarms, sourceMap]);
  useEffect(() => {
    if (!selectedTag) return;
    document.querySelector(`[data-tag="${sourceMap.get(selectedTag) ?? selectedTag}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [selectedTag, sourceMap]);
  const toggleValve = (tag: string) => {
    const v = valves.get(tag);
    if (!v || v.locked) return;
    commandValve(tag, v.targetPosition > 0.5 ? 0 : 1, 'manual', 'SCADA operator');
  };
  return (
    <svg viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`} style={{ width: '100%', height: '100%', minWidth: 960, minHeight: 600, background: '#f8fafc' }} aria-label="P and ID">
      {graph.edges.filter((e) => items[e.from] && items[e.to]).map((e) => <Pipe key={e.id} from={items[e.from]} to={items[e.to]} />)}
      {Object.entries(items).map(([tag, item]) => {
        const selected = selectedTag === tag;
        const alarm = alarmTags.has(tag);
        return item.symbol === 'valve'
          ? (valves.get(tag) ? <Valve key={tag} valve={valves.get(tag)!} x={item.x} y={item.y} rotation={item.rotation} selected={selected} alarm={alarm} onClick={() => toggleValve(tag)} /> : null)
          : <Vessel key={tag} tag={tag} x={item.x} y={item.y} symbol={item.symbol} selected={selected} alarm={alarm} onClick={() => selectTag(tag)} />;
      })}
    </svg>
  );
}
