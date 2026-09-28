import type { ReactNode } from 'react';

interface VesselProps {
  tag: string;
  x: number;
  y: number;
  symbol: string;
  scale?: number;
  selected?: boolean;
  alarm?: boolean;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
}

const COLORS: Record<string, string> = {
  well: '#0ea5e9',
  manifold: '#6b7280',
  vessel: '#475569',
  sink: '#374151',
  flame: '#ef4444',
  tank: '#0ea5e9',
  transmitter: '#eab308',
  controller: '#22c55e',
  pump: '#0ea5e9',
  compressor: '#0ea5e9',
  source: '#0ea5e9',
  header: '#6b7280',
  junction: '#6b7280',
  'slug-catcher-vessel': '#475569',
  'slug-catcher-fingers': '#475569',
  desander: '#475569',
  scrubber: '#475569',
  separator: '#475569',
};

/** Process fills drawn inside a vessel body (liquid, sand, demister mesh). */
const LIQUID_FILL = 'rgba(59,130,246,0.45)';
const SAND_FILL = 'rgba(217,119,6,0.55)';
const MESH_STROKE = '#94a3b8';

interface ShapeStyle {
  stroke: string;
  fill: string;
  strokeWidth: number;
}

/**
 * Geometry for every equipment symbol, centred on the item origin so the
 * `translate(x,y) scale(s)` transform on the group does the placement. New
 * symbols must never fall through to `null`; the registry test guards that.
 */
const shape = (symbol: string, base: ShapeStyle): ReactNode => {
  switch (symbol) {
    case 'well': return <circle r={16} {...base} />;
    case 'manifold': return <rect x={-26} y={-14} width={52} height={28} rx={4} {...base} />;
    case 'vessel': return <ellipse rx={32} ry={20} {...base} />;
    case 'sink': return <rect x={-18} y={-14} width={36} height={28} rx={2} {...base} />;
    case 'flame': return <path d="M-10,10 Q0,-22 10,10 Q0,2 -10,10" {...base} />;
    case 'tank': return <rect x={-22} y={-26} width={44} height={52} rx={4} {...base} />;
    case 'transmitter': return <polygon points="0,-14 14,0 0,14 -14,0" {...base} />;
    case 'controller': return <rect x={-18} y={-12} width={36} height={24} rx={2} {...base} />;
    case 'pump': return <path d="M-12,-12 L12,0 L-12,12 Z" {...base} />;
    case 'compressor': return <path d="M-14,-10 L14,-10 L10,0 L14,10 L-14,10 L-10,0 Z" {...base} />;
    case 'source': return <circle r={12} {...base} />;
    case 'header': return <rect x={-30} y={-10} width={60} height={20} rx={4} {...base} />;
    case 'junction': return <circle r={10} {...base} />;

    // Slug catcher (vessel type): horizontal shell with a liquid boot / drip leg
    // and the inlet (left) / gas outlet (top) nozzles.
    case 'slug-catcher-vessel':
      return (
        <g>
          <rect x={-40} y={-14} width={80} height={28} rx={8} {...base} />
          <rect x={-13} y={12} width={26} height={16} rx={3} {...base} />
          <rect x={-10} y={20} width={20} height={6} fill={LIQUID_FILL} stroke="none" />
          <line x1={-40} y1={0} x2={-49} y2={0} stroke={base.stroke} strokeWidth={base.strokeWidth} />
          <line x1={0} y1={-14} x2={0} y2={-23} stroke={base.stroke} strokeWidth={base.strokeWidth} />
        </g>
      );

    // Slug catcher (finger type): parallel finger tubes between a common inlet
    // header and a common outlet header. Wider than the other symbols on
    // purpose; the template spacing leaves room for the extra width.
    case 'slug-catcher-fingers':
      return (
        <g>
          <rect x={-48} y={-26} width={96} height={10} rx={3} {...base} />
          <rect x={-48} y={16} width={96} height={10} rx={3} {...base} />
          {[-40, -20, 0, 20, 40].map((fx) => (
            <rect key={fx} x={fx - 4} y={-16} width={8} height={32} rx={4} {...base} />
          ))}
        </g>
      );

    // Desarenador: vertical shell with a conical sand bottom and a sand-drain
    // nozzle under the cone.
    case 'desander':
      return (
        <g>
          <rect x={-22} y={-34} width={44} height={48} rx={6} {...base} />
          <path d="M-22,14 L0,34 L22,14 Z" {...base} />
          <path d="M-16,22 L0,34 L16,22 Z" fill={SAND_FILL} stroke="none" />
          <line x1={0} y1={34} x2={0} y2={44} stroke={base.stroke} strokeWidth={base.strokeWidth} />
          <line x1={-22} y1={-10} x2={-30} y2={-10} stroke={base.stroke} strokeWidth={base.strokeWidth} />
        </g>
      );

    // Scrubber: vertical vessel with a demister / mist-extractor mesh band
    // drawn inside the upper section.
    case 'scrubber':
      return (
        <g>
          <rect x={-22} y={-38} width={44} height={76} rx={8} {...base} />
          <path
            d="M-18,-24 L-6,-16 L6,-24 L18,-16 M-18,-16 L-6,-8 L6,-16 L18,-8"
            fill="none"
            stroke={MESH_STROKE}
            strokeWidth={2}
          />
          <rect x={-18} y={26} width={36} height={8} fill={LIQUID_FILL} stroke="none" />
          <line x1={-22} y1={6} x2={-30} y2={6} stroke={base.stroke} strokeWidth={base.strokeWidth} />
          <line x1={0} y1={-38} x2={0} y2={-46} stroke={base.stroke} strokeWidth={base.strokeWidth} />
        </g>
      );

    // Separator: horizontal three-phase shell with a weir and a liquid level.
    case 'separator':
      return (
        <g>
          <rect x={-42} y={-16} width={84} height={32} rx={10} {...base} />
          <line x1={8} y1={-4} x2={8} y2={16} stroke={base.stroke} strokeWidth={base.strokeWidth} />
          <rect x={-36} y={4} width={44} height={10} fill={LIQUID_FILL} stroke="none" />
          <line x1={0} y1={-16} x2={0} y2={-24} stroke={base.stroke} strokeWidth={base.strokeWidth} />
          <line x1={-24} y1={16} x2={-24} y2={24} stroke={base.stroke} strokeWidth={base.strokeWidth} />
          <line x1={30} y1={16} x2={30} y2={24} stroke={base.stroke} strokeWidth={base.strokeWidth} />
        </g>
      );

    default: return null;
  }
};

/** Distance from the item origin to the tag label, so it clears the glyph. */
const LABEL_DY: Record<string, number> = {
  tank: 38,
  transmitter: 26,
  controller: 26,
  'slug-catcher-vessel': 46,
  'slug-catcher-fingers': 44,
  desander: 56,
  scrubber: 50,
  separator: 42,
};

export function Vessel({ tag, x, y, symbol, scale = 1, selected, alarm, onClick, onMouseDown }: VesselProps) {
  const fill = alarm ? 'rgba(239,68,68,0.2)' : (COLORS[symbol] ?? '#4b5563');
  const stroke = selected ? 'var(--accent)' : alarm ? 'var(--alarm-critical)' : '#e5e7eb';
  const strokeWidth = selected ? 3 : alarm ? 2.5 : 1.5;
  const base = { stroke, fill, strokeWidth };
  const dy = LABEL_DY[symbol] ?? 30;
  return (
    <g data-tag={tag} data-symbol={symbol} transform={`translate(${x},${y}) scale(${scale})`} onClick={onClick} onMouseDown={onMouseDown} style={{ cursor: onMouseDown ? 'move' : onClick ? 'pointer' : 'default' }}>
      {shape(symbol, base)}
      <text y={dy} textAnchor="middle" fontSize={10} fill="var(--text-primary)" style={{ fontFamily: 'Consolas, monospace' }}>{tag}</text>
    </g>
  );
}
