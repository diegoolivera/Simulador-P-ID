import type { Valve as ValveType } from '../types/plant';

interface ValveProps {
  valve: ValveType;
  x: number;
  y: number;
  rotation?: number;
  selected?: boolean;
  alarm?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

export function Valve({ valve, x, y, rotation = 0, selected, alarm, onClick, onMouseDown }: ValveProps) {
  const fill = valve.locked ? 'var(--valve-locked)' : alarm ? 'var(--alarm-critical)' : valve.targetPosition > 0.5 ? 'var(--valve-open)' : 'var(--valve-closed)';
  const stroke = selected ? 'var(--accent)' : '#1f2937';
  const strokeWidth = selected ? 3 : 1.5;
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation})`} onClick={onClick} onMouseDown={onMouseDown} data-tag={valve.tag} style={{ cursor: onMouseDown ? 'move' : onClick ? 'pointer' : 'default' }}>
      <circle r={14} fill="#111827" stroke={stroke} strokeWidth={strokeWidth} />
      <line x1={-10} y1={0} x2={10} y2={0} stroke={fill} strokeWidth={4} strokeLinecap="round" />
      <line x1={0} y1={-10} x2={0} y2={10} stroke={fill} strokeWidth={4} strokeLinecap="round" transform={`rotate(${valve.position * 90})`} />
      {valve.targetPosition > 0.5 && valve.targetPosition < 1 && (
        <text y={-18} textAnchor="middle" fontSize={9} fill="var(--text-secondary)">{Math.round(valve.position * 100)}%</text>
      )}
      <text y={24} textAnchor="middle" fontSize={10} fill="var(--text-primary)" style={{ fontFamily: 'Consolas, monospace' }}>{valve.tag}</text>
      {valve.locked && <circle r={4} cx={10} cy={-10} fill="var(--valve-locked)" />}
      {alarm && <circle r={3} cx={-10} cy={-10} fill="var(--alarm-critical)" />}
    </g>
  );
}
