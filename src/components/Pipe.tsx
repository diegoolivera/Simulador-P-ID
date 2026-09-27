interface PipeProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  flowing?: boolean;
}

export function Pipe({ from, to, flowing }: PipeProps) {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const dash = flowing ? `${length * 0.15} ${length * 0.1}` : undefined;
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="var(--pipe)"
      strokeWidth={flowing ? 3 : 2}
      strokeDasharray={dash}
      style={flowing ? { animation: 'flowDash 1s linear infinite' } : undefined}
    />
  );
}
