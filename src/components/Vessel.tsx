interface VesselProps { tag: string; x: number; y: number; symbol: string; selected?: boolean; alarm?: boolean; onClick?: () => void; }

const COLORS: Record<string, string> = {
  well: '#bfdbfe', manifold: '#e2e8f0', vessel: '#cbd5e1', sink: '#e2e8f0',
  flame: '#fca5a5', tank: '#bfdbfe', transmitter: '#fef08a', controller: '#bbf7d0',
};

const shape = (symbol: string, base: object) => {
  switch (symbol) {
    case 'well': return <circle r={18} {...base} />;
    case 'manifold': return <rect x={-24} y={-16} width={48} height={32} rx={4} {...base} />;
    case 'vessel': return <ellipse rx={30} ry={20} {...base} />;
    case 'sink': return <rect x={-20} y={-16} width={40} height={32} rx={2} {...base} />;
    case 'flame': return <path d="M-10,10 Q0,-20 10,10 Q0,0 -10,10" {...base} />;
    case 'tank': return <rect x={-22} y={-28} width={44} height={56} rx={4} {...base} />;
    case 'transmitter': return <polygon points="0,-14 14,0 0,14 -14,0" {...base} />;
    case 'controller': return <rect x={-20} y={-14} width={40} height={28} rx={2} {...base} />;
    default: return null;
  }
};

export function Vessel({ tag, x, y, symbol, selected, alarm, onClick }: VesselProps) {
  const base = { stroke: selected ? '#2563eb' : alarm ? '#ef4444' : '#0f172a', fill: alarm ? '#fee2e2' : (COLORS[symbol] ?? '#e2e8f0'), strokeWidth: selected ? 3 : 1 };
  const dy = symbol === 'tank' ? 40 : symbol === 'controller' || symbol === 'transmitter' ? 28 : 32;
  return (
    <g data-tag={tag} transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {shape(symbol, base)}
      <text y={dy} textAnchor="middle" fontSize={11} fill="#0f172a">{tag}</text>
    </g>
  );
}
