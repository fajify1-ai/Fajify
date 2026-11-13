import { type NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '../../../../lib/config';
import { adminRequest, adminStatus } from '../../../../lib/admin-api';
import { commandRequest } from '../../../../lib/operations-contract';
import { sessionCookie, sessions } from '../../../../lib/session';

export async function POST(request: NextRequest, context: { params: Promise<{ command: string }> }) {
  const result = (status: number) => NextResponse.json({ ok: status === 200 }, { status });
  if (!sameOrigin(request)) return result(403);
  const session = sessions.get(request.cookies.get(sessionCookie)?.value);
  if (!session) return result(401);
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return result(400);
  const { command } = await context.params;
  const input = commandRequest(command, await request.json().catch(() => null));
  if (!input) return result(400);
  try {
    const response = await adminRequest(session.accessToken, input.path, input.body);
    if (response.ok) return result(200);
    const status = await adminStatus(response);
    return result([400, 401, 403, 404, 409, 429].includes(status) ? status : 503);
  } catch {
    return result(503);
  }
}
