import { applicationIdPattern } from './merchant-contract';

export const incidentTypes = ['booking', 'order', 'ride', 'provider', 'security', 'platform'] as const;
export const severities = ['low', 'medium', 'high', 'critical'] as const;
export const priorities = ['low', 'normal', 'high', 'urgent'] as const;
export const transitions: Record<string, readonly string[]> = {
  open: ['investigating', 'resolved'],
  investigating: ['mitigated', 'resolved'],
  mitigated: ['investigating', 'resolved'],
  resolved: ['investigating'],
};

export function commandRequest(command: string, value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (command === 'monitor-check') return Object.keys(input).length === 0 ? { path: 'monitoring/check', body: {} } : null;
  const { requestKey, id, reason, message, priority, assignee, status, state, incidentType, severity, summary, resourceId } = input;
  if (typeof requestKey !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(requestKey)) return null;
  const text = (v: unknown, min: number, max: number): v is string =>
    typeof v === 'string' && v.trim().length >= min && v.length <= max;
  const uuid = (v: unknown): v is string => typeof v === 'string' && applicationIdPattern.test(v);
  const allowed = (v: unknown, values: readonly string[]): v is string => typeof v === 'string' && values.includes(v);
  if (command === 'incident-create' && allowed(incidentType, incidentTypes) && allowed(severity, severities)
      && text(summary, 8, 200) && (resourceId === undefined || uuid(resourceId))) {
    return { path: 'incidents', body: { requestKey, incidentType, severity, summary, ...(resourceId && { resourceId }) } };
  }
  if (!uuid(id)) return null;
  const support = 'support/cases/' + id;
  switch (command) {
    case 'support-reply':
      return text(message, 1, 4000) ? { path: support + '/messages', body: { requestKey, message } } : null;
    case 'support-assign':
      return allowed(priority, priorities) && (assignee === null || text(assignee, 1, 255)) && text(reason, 8, 500)
        ? { path: support + '/assignment', body: { requestKey, priority, assignee, reason } } : null;
    case 'support-status':
      return allowed(status, ['open', 'closed']) && text(reason, 8, 500)
        ? { path: support + '/status', body: { requestKey, status, reason } } : null;
    case 'alert-acknowledge':
      return { path: 'monitoring/alerts/' + id + '/acknowledgement', body: { requestKey } };
    case 'incident-status':
      return allowed(state, Object.keys(transitions)) && text(reason, 8, 500)
        ? { path: 'incidents/' + id + '/status', body: { requestKey, state, reason } } : null;
    default:
      return null;
  }
}

export function formatNaira(value: string) {
  if (!/^-?\d+$/.test(value)) return '—';
  const amount = BigInt(value);
  const absolute = amount < BigInt(0) ? -amount : amount;
  return (amount < BigInt(0) ? '−' : '') + '₦' + (absolute / BigInt(100)).toLocaleString('en-NG') + '.' +
    String(absolute % BigInt(100)).padStart(2, '0');
}
