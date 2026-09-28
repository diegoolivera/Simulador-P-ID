import type { ReactNode } from 'react';
import type { Valve as ValveModel, ValveType as ValveKind } from '../types/plant';

interface ValveProps {
  valve: ValveModel;
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
  selected?: boolean;
  alarm?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

/** Classic two-triangle valve body, drawn horizontally; `rotation` turns it. */
const BOWTIE_POINTS = '-9,-9 9,-9 -9,9 9,9';

/**
 * Actuator drawn above the body. Each valve type gets a shape the operator can
 * tell apart at a glance, following the legacy prototype's bowtie and standard
 * ISA / ISO 10628 conventions.
 */
const actuator = (type: ValveKind, stroke: string, strokeWidth: number): ReactNode => {
  switch (type) {
    case 'manual':
      // Handwheel: stem plus a cross bar, no actuator.
      return (
        <g>
          <line x1={0} y1={-9} x2={0} y2={-18} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={-6} y1={-18} x2={6} y2={-18} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    case 'control':
      // Diaphragm actuator: dome on a stem.
      return (
        <g>
          <line x1={0} y1={-9} x2={0} y2={-14} stroke={stroke} strokeWidth={strokeWidth} />
          <path d="M-8,-14 A8,7 0 0 1 8,-14 Z" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    case 'sdv':
      // Shutdown valve: square actuator block with a bar (piston).
      return (
        <g>
          <line x1={0} y1={-9} x2={0} y2={-14} stroke={stroke} strokeWidth={strokeWidth} />
          <rect x={-7} y={-24} width={14} height={10} rx={1} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={-7} y1={-19} x2={7} y2={-19} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    case 'bdv':
      // Blowdown valve: round actuator with a bleed slash, distinct from the SDV block.
      return (
        <g>
          <line x1={0} y1={-9} x2={0} y2={-14} stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx={0} cy={-19} r={6} fill="none" stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={-4} y1={-23} x2={4} y2={-15} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
    case 'psv':
      // PSV body is drawn separately (angle body + spring); no stem actuator.
      return null;
    default:
      // A future ValveType member must never render blank: fall back to the
      // handwheel so the valve stays visible and clickable.
      return (
        <g>
          <line x1={0} y1={-9} x2={0} y2={-18} stroke={stroke} strokeWidth={strokeWidth} />
          <line x1={-6} y1={-18} x2={6} y2={-18} stroke={stroke} strokeWidth={strokeWidth} />
        </g>
      );
  }
};

/**
 * PSV: relief valve drawn as an angle body with a spring, per the task's
 * symbology. Replaces the bowtie entirely so it cannot be mistaken for a
 * block/control valve.
 */
const reliefBody = (fill: string, stroke: string, strokeWidth: number): ReactNode => (
  <g>
    <polygon points="-9,9 0,-7 9,9" fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    <line x1={0} y1={-7} x2={0} y2={-13} stroke={stroke} strokeWidth={strokeWidth} />
    <path d="M-6,-13 L-3,-17 L3,-9 L6,-13" fill="none" stroke={stroke} strokeWidth={strokeWidth} />
    <line x1={9} y1={9} x2={16} y2={9} stroke={stroke} strokeWidth={strokeWidth} />
  </g>
);

export function Valve({ valve, x, y, rotation = 0, scale = 1, selected, alarm, onClick, onMouseDown }: ValveProps) {
  const fill = valve.locked ? 'var(--valve-locked)' : alarm ? 'var(--alarm-critical)' : valve.targetPosition > 0.5 ? 'var(--valve-open)' : 'var(--valve-closed)';
  const stroke = selected ? 'var(--accent)' : '#1f2937';
  const strokeWidth = selected ? 3 : 1.5;
  return (
    <g transform={`translate(${x},${y}) rotate(${rotation}) scale(${scale})`} onClick={onClick} onMouseDown={onMouseDown} data-tag={valve.tag} data-valve-type={valve.type} style={{ cursor: onMouseDown ? 'move' : onClick ? 'pointer' : 'default' }}>
      {valve.type === 'psv' ? (
        reliefBody(fill, stroke, strokeWidth)
      ) : (
        <polygon points={BOWTIE_POINTS} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      )}
      {actuator(valve.type, stroke, strokeWidth)}
      {valve.targetPosition > 0.5 && valve.targetPosition < 1 && (
        <text y={-30} textAnchor="middle" fontSize={9} fill="var(--text-secondary)">{Math.round(valve.position * 100)}%</text>
      )}
      <text y={24} textAnchor="middle" fontSize={10} fill="var(--text-primary)" style={{ fontFamily: 'Consolas, monospace' }}>{valve.tag}</text>
      {valve.locked && <circle data-badge="locked" r={4} cx={10} cy={-10} fill="var(--valve-locked)" />}
      {alarm && <circle data-badge="alarm" r={3} cx={-10} cy={-10} fill="var(--alarm-critical)" />}
    </g>
  );
}
