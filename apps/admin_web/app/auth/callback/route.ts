import { type NextRequest, NextResponse } from 'next/server';
import { config, operatorHome } from '../../../lib/config';
import { finishLogin } from '../../../lib/oidc';
import { cookieOptions, sessionCookie, sessions, transactionCookie } from '../../../lib/session';

export async function GET(request: NextRequest) {
  let origin: string;
  try {
    ({ origin } = config());
  } catch {
    return new Response('Sign-in unavailable', { status: 503 });
  }

  const transactionId = request.cookies.get(transactionCookie)?.value;
  let response: NextResponse;
  try {
    const session = await finishLogin(request, transactionId);
    if (session) {
      const sessionId = sessions.create(session);
      sessions.remove(request.cookies.get(sessionCookie)?.value);
      response = NextResponse.redirect(origin + operatorHome, 303);
      response.cookies.set(sessionCookie, sessionId, { ...cookieOptions, expires: new Date(session.expires) });
    } else {
      response = NextResponse.redirect(origin + '/?auth=forbidden', 303);
    }
  } catch {
    response = NextResponse.redirect(origin + '/?auth=failed', 303);
  }
  response.cookies.set(transactionCookie, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
