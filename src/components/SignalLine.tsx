interface SignalLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Instrument signal annotation drawn between an instrument bubble and the
 * equipment it monitors. It is intentionally NOT a process pipe: it uses a
 * muted colour, a thin stroke and a short dash pattern so it reads as a signal,
 * and it never participates in the plant graph. `pointerEvents: none` keeps it
 * from stealing drag/click from the items it connects.
 */
export function SignalLine({ from, to }: SignalLineProps) {
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke="var(--text-secondary)"
      strokeWidth={1}
      strokeDasharray="4 4"
      opacity={0.75}
      pointerEvents="none"
      data-signal-line="true"
    />
  );
}
