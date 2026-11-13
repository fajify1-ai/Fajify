import { type NextRequest, NextResponse } from 'next/server';
import { config, sameOrigin } from '../../../lib/config';
import { applicationIdPattern, maxOffset, pageSize, parseQueue } from '../../../lib/merchant-contract';
import { sessionCookie, sessions } from '../../../lib/session';

function result(value: object, status = 200) {
  return NextResponse.json(value, { status });
}

async function forward(request: NextRequest, path: string, body?: object) {
  const session = sessions.get(request.cookies.get(sessionCookie)?.value);
  if (!session) return new Response(null, { status: 401 });

  return fetch(config().api + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      authorization: 'Bearer ' + session.accessToken,
      accept: 'application/json',
      ...(body && { 'content-type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
}

async function failure(response: Response) {
  if (response.status === 403) {
    const detail = await response.json().catch(() => null);
    if (detail?.error?.message === 'Privileged authentication required') return result({ code: 'reauthenticate' }, 401);
    if (detail?.error?.message === 'Administrative scope required') return result({ code: 'queue_scope_required' }, 403);
  }
  const status = [400, 401, 403, 404, 409, 429].includes(response.status) ? response.status : 503;
  return result({ code: 'request_failed' }, status);
}

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get('offset') ?? '0';
  const offset = Number(value);
  if (!/^\d{1,5}$/.test(value) || offset > maxOffset) return result({ code: 'invalid_offset' }, 400);
  try {
    const response = await forward(request, `/api/v1/admin/governance/approvals?limit=${pageSize}&offset=${offset}`);
    if (!response.ok) return failure(response);
    return result(parseQueue(await response.json(), offset));
  } catch {
    return result({ code: 'queue_unavailable' }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return result({ code: 'forbidden' }, 403);
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return result({ code: 'invalid_review' }, 400);
  }
  const input = await request.json().catch(() => null);
  if (typeof input?.id !== 'string' || !applicationIdPattern.test(input.id) ||
      (input.decision !== 'approved' && input.decision !== 'rejected')) {
    return result({ code: 'invalid_review' }, 400);
  }

  try {
    const response = await forward(request, `/api/v1/business/onboarding/${input.id}/review`, {
      decision: input.decision,
    });
    if (!response.ok) return failure(response);
    const reviewed = await response.json();
    if (reviewed.id !== input.id || reviewed.status !== input.decision) throw new Error('Unexpected review response');
    return result({ status: reviewed.status });
  } catch {
    return result({ code: 'review_unconfirmed' }, 503);
  }
}
