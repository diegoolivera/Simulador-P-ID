import type { AuditEvent } from '../types/plant';

export function filterBy<K extends keyof AuditEvent>(
  audit: AuditEvent[],
  key: K,
  value: AuditEvent[K]
): AuditEvent[] {
  return audit.filter((e) => e[key] === value);
}

export function latest(audit: AuditEvent[]): AuditEvent | undefined {
  return audit[audit.length - 1];
}
