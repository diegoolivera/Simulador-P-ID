interface TieInLineProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

/**
 * Utility tie-in annotation drawn between an auxiliary system node and the
 * process node it connects to.
 *
 * A tie-in is neither a process pipe nor an instrument signal, so it gets a
 * THIRD, clearly distinguishable treatment:
 *   - process pipe   : solid, `--pipe` colour, width 2-3;
 *   - instrument signal (SignalLine): thin grey `--text-secondary` dashed "4 4";
 *   - tie-in (here)  : amber `--warning`, dash-dot "12 4 2 4", width 1.5, plus a
 *                      small diamond marker at the process end so the connection
 *                      point reads at a glance.
 *
 * `pointerEvents: none` keeps it from stealing drag/click from the items it
 * connects, and like the signal layer it never enters `PlantGraph.edges`.
 */
export function TieInLine({ from, to }: TieInLineProps) {
  return (
    <g pointerEvents="none" data-tie-in-line="true">
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="var(--warning)"
        strokeWidth={1.5}
        strokeDasharray="12 4 2 4"
        opacity={0.9}
      />
      <rect
        x={to.x - 3}
        y={to.y - 3}
        width={6}
        height={6}
        transform={`rotate(45 ${to.x} ${to.y})`}
        fill="var(--warning)"
        opacity={0.9}
      />
    </g>
  );
}
