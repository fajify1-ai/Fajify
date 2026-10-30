import "server-only";
import {
  expiredSessionCookie,
  type ServerSession,
  type SessionService,
} from "./session.server";

const privateHeaders = { "Cache-Control": "no-store" };

/** Reuse inside each future protected handler, not only a shared layout.
 * A cookie's presence alone is never sufficient authorization.
 */
export async function withCustomerSession(
  cookieValue: string | undefined,
  sessions: SessionService,
  handler: (session: ServerSession) => Promise<Response>,
): Promise<Response> {
  let session: ServerSession | null;
  try {
    session = await sessions.read(cookieValue);
  } catch {
    return new Response(null, { status: 503, headers: privateHeaders });
  }
  if (!session) {
    return new Response(null, {
      status: 401,
      headers: { ...privateHeaders, "Set-Cookie": expiredSessionCookie() },
    });
  }
  const response = await handler(session);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** Mount only once a trusted HTTPS application origin is approved.
 * Logout is a mutation: require POST and exact Origin for CSRF protection.
 */
export async function logoutCustomer(
  request: Request,
  cookieValue: string | undefined,
  sessions: SessionService,
  trustedOrigin: string,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { ...privateHeaders, Allow: "POST" },
    });
  }
  let origin: URL;
  try { origin = new URL(trustedOrigin); }
  catch { return new Response(null, { status: 503, headers: privateHeaders }); }
  if (
    origin.protocol !== "https:" || origin.origin !== trustedOrigin ||
    request.headers.get("origin") !== trustedOrigin
  ) return new Response(null, { status: 403, headers: privateHeaders });

  let status = 204;
  try { await sessions.logout(cookieValue); }
  catch { status = 503; }
  return new Response(null, {
    status,
    headers: { ...privateHeaders, "Set-Cookie": expiredSessionCookie() },
  });
}
