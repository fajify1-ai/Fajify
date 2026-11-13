export const pageSize = 20;
export const maxOffset = 10_000;
export const applicationIdPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
export type Decision = 'approved' | 'rejected';

export type Application = {
  id: string;
  displayName: string;
  status: 'pending';
  createdAt: string;
};

export type QueuePage = { items: Application[]; nextOffset: number | null };

export function parseQueue(value: unknown, offset: number): QueuePage {
  if (!value || typeof value !== 'object' || !('items' in value) || !('nextOffset' in value) ||
      !Array.isArray(value.items) || value.items.length > pageSize) throw new Error('Invalid queue');

  const items = value.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid application');
    const { id, displayName, status, createdAt } = item as Partial<Application>;
    if (typeof id !== 'string' || !applicationIdPattern.test(id) || typeof displayName !== 'string' ||
        status !== 'pending' || typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))) {
      throw new Error('Invalid application');
    }
    return { id, displayName, status, createdAt };
  });
  const nextOffset = value.nextOffset;
  if (nextOffset !== null && (nextOffset !== offset + pageSize || items.length !== pageSize)) {
    throw new Error('Invalid pagination');
  }
  return { items, nextOffset: typeof nextOffset === 'number' && nextOffset <= maxOffset ? nextOffset : null };
}
