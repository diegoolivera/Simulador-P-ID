import { useEffect } from 'react';
import { useEvalStore } from '../stores/evalStore';

export function ScenarioReport() {
  const { report, audit, finalize } = useEvalStore();
  useEffect(() => { finalize(); }, [finalize]);
  if (!report) return <div>No report available.</div>;
  return (
    <div aria-label="Scenario report">
      <h2>Scenario Report</h2>
      <div>Tier: {report.tier} — Score: {report.score} / {report.max}</div>
      <ul>{report.results.map((r) => <li key={r.id}>{r.severity}: {r.message}</li>)}</ul>
      <table>
        <thead><tr><th>Time</th><th>Source</th><th>Tag</th><th>Field</th><th>From</th><th>To</th><th>Reason</th></tr></thead>
        <tbody>{audit.map((e, i) => <tr key={i}><td>{e.t.toFixed(1)}</td><td>{e.source}</td><td>{e.tag}</td><td>{e.field}</td><td>{String(e.from)}</td><td>{String(e.to)}</td><td>{e.reason ?? '-'}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
