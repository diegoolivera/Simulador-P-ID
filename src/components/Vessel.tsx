interface VesselProps {
  tag: string;
  x: number;
  y: number;
  symbol: string;
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
};

const shape = (symbol: string, base: object) => {
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
    default: return null;
  }
};

export function Vessel({ tag, x, y, symbol, selected, alarm, onClick, onMouseDown }: VesselProps) {
  const fill = alarm ? 'rgba(239,68,68,0.2)' : (COLORS[symbol] ?? '#4b5563');
  const stroke = selected ? 'var(--accent)' : alarm ? 'var(--alarm-critical)' : '#e5e7eb';
  const strokeWidth = selected ? 3 : alarm ? 2.5 : 1.5;
  const base = { stroke, fill, strokeWidth };
  const dy = symbol === 'tank' ? 38 : symbol === 'controller' || symbol === 'transmitter' ? 26 : 30;
  return (
    <g data-tag={tag} transform={`translate(${x},${y})`} onClick={onClick} onMouseDown={onMouseDown} style={{ cursor: onMouseDown ? 'move' : onClick ? 'pointer' : 'default' }}>
      {shape(symbol, base)}
      <text y={dy} textAnchor="middle" fontSize={10} fill="var(--text-primary)" style={{ fontFamily: 'Consolas, monospace' }}>{tag}</text>
    </g>
  );
}
