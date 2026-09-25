import type { Valve as ValveType } from '../types/plant';

interface ValveProps { valve: ValveType; x: number; y: number; rotation?: number; selected?: boolean; alarm?: boolean; onClick?: () => void; }

export function Valve({ valve, x, y, rotation = 0, selected, alarm, onClick }: ValveProps) {
  const fill = valve.locked ? '#f59e0b' : alarm ? '#ef4444' : valve.targetPosition > 0.5 ? '#22c55e' : '#94a3b8';
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} onClick={onClick} data-tag={valve.tag} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <polygon points="-12,-8 0,-16 12,-8 0,0" fill={fill} stroke="#0f172a" strokeWidth={selected ? 3 : 1} />
      <polygon points="-12,8 0,0 12,8 0,16" fill={fill} stroke="#0f172a" strokeWidth={selected ? 3 : 1} />
      <text y={24} textAnchor="middle" fontSize={11} fill="#0f172a">{valve.tag}</text>
      {valve.locked && <text y={-20} textAnchor="middle" fontSize={10} fill="#f59e0b">L</text>}
    </g>
  );
}
