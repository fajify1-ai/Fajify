import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminRequest, adminStatus } from './admin-api';
import { sessionCookie, sessions } from './session';

export async function requireOperator() {
  const id = (await cookies()).get(sessionCookie)?.value;
  const session = await sessions.get(id);
  if (!session) redirect(id ? '/?auth=expired' : '/');
  return session;
}

export type AdminResult<T> = { data: T; status: 200 } | { data?: undefined; status: number };
export async function readAdmin<T>(token: string, path: string): Promise<AdminResult<T>> {
  let result: AdminResult<T>;
  try {
    const response = await adminRequest(token, path);
    result = response.ok ? { data: await response.json() as T, status: 200 } : { status: await adminStatus(response) };
  } catch {
    result = { status: 503 };
  }
  if (result.status === 401) redirect('/?auth=expired');
  return result;
}
