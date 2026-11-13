import { type NextRequest, NextResponse } from 'next/server';
import { config, sameOrigin } from '../../../lib/config';
import { beginLogin } from '../../../lib/oidc';
import { cookieOptions, transactionCookie, transactions, transactionSeconds } from '../../../lib/session';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new Response('Sign-in unavailable', { status: 403 });

  try {
    await transactions.remove(request.cookies.get(transactionCookie)?.value);
    const { url, transactionId } = await beginLogin();
    const response = NextResponse.redirect(url, 303);
    response.cookies.set(transactionCookie, transactionId, { ...cookieOptions, maxAge: transactionSeconds });
    return response;
  } catch {
    return NextResponse.redirect(config().origin + '/?auth=unavailable', 303);
  }
}
