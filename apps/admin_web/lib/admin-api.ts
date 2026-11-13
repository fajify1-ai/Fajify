import 'server-only';
import { config } from './config';

export async function adminRequest(token: string, path: string, body?: Record<string, unknown>) {
  return fetch(config().api + '/api/v1/admin/' + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { authorization: 'Bearer ' + token, accept: 'application/json',
      ...(body !== undefined && { 'content-type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
    redirect: 'error',
    cache: 'no-store',
  });
}

export async function adminStatus(response: Response) {
  if (response.status === 403) {
    const detail = await response.json().catch(() => null);
    if (detail?.error?.message === 'Privileged authentication required') return 401;
  }
  return response.status;
}
