interface PipeProps { from: { x: number; y: number }; to: { x: number; y: number }; }

export function Pipe({ from, to }: PipeProps) {
  return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#64748b" strokeWidth={2} />;
}
