import { type NextRequest, NextResponse } from 'next/server';
import { sameOrigin } from '../../../lib/config';
import { logoutUrl } from '../../../lib/oidc';
import { cookieOptions, sessionCookie, sessions, transactionCookie, transactions } from '../../../lib/session';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new Response('Sign-out unavailable', { status: 403 });

  sessions.remove(request.cookies.get(sessionCookie)?.value);
  transactions.remove(request.cookies.get(transactionCookie)?.value);
  const response = NextResponse.redirect(logoutUrl(), 303);
  response.cookies.set(sessionCookie, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(transactionCookie, '', { ...cookieOptions, maxAge: 0 });
  return response;
}
