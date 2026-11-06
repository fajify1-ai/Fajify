import "server-only";

import type { WebOidcSettings } from "./config.server";
import { InvalidOidcCallback, type OidcCallbackService } from "./oidc.server";
import { completeOidcLogin, expiredOidcBindingCookie, type CustomerWebJourney,
  type OpenIdClientAdapter, type WritableOidcTransactionStore } from "./openid-client.server";
import type { SessionService, SessionRevoker } from "./session.server";

/** Supplied only by reviewed production composition with durable stores. No
 * routes are mounted by this module and no test fallback is used at runtime.
 */
export interface CustomerWebJourneyRuntime {
  readonly settings: WebOidcSettings;
  readonly adapter: Pick<OpenIdClientAdapter, "begin">;
  readonly transactions: WritableOidcTransactionStore;
  readonly callback: OidcCallbackService;
  readonly sessions: SessionService;
  readonly revoker: SessionRevoker;
}

const privateHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
function failure(status: number, code: string, clearBinding = false): Response {
  return Response.json({ code }, { status, headers: { ...privateHeaders,
    ...(clearBinding ? { "Set-Cookie": expiredOidcBindingCookie() } : {}),
  } });
}

/** Initiation changes browser binding: enforce POST/exact trusted Origin for
 * every journey. Never collect email/password or accept arbitrary OIDC params.
 */
export async function beginCustomerJourney(request: Request,
  runtime: CustomerWebJourneyRuntime | null, journey: CustomerWebJourney): Promise<Response> {
  if (request.method !== "POST") return new Response(null, {
    status: 405, headers: { ...privateHeaders, Allow: "POST" },
  });
  if (!runtime) return failure(503, "authentication_unavailable");
  if (request.headers.get("origin") !== runtime.settings.auth.redirectUri.origin) {
    return failure(403, "request_not_allowed");
  }
  try {
    const result = await runtime.adapter.begin(runtime.transactions, journey);
    if (result.redirect.protocol !== "https:" || result.redirect.username ||
      result.redirect.password || result.redirect.hash) throw new Error();
    return new Response(null, { status: 303, headers: { ...privateHeaders,
      Location: result.redirect.href, "Set-Cookie": result.cookie,
    } });
  } catch { return failure(503, "authentication_unavailable"); }
}

/** The return target is approved application configuration, NOT a callback
 * query parameter. No user-supplied redirect or provider error is reflected.
 */
export async function completeCustomerJourney(request: Request,
  runtime: CustomerWebJourneyRuntime | null, browserBinding: string | undefined,
  successRedirect: URL, previousSessionId?: string): Promise<Response> {
  if (request.method !== "GET") return new Response(null, {
    status: 405, headers: { ...privateHeaders, Allow: "GET" },
  });
  if (!runtime) return failure(503, "authentication_unavailable", true);
  if (successRedirect.protocol !== "https:" ||
    successRedirect.origin !== runtime.settings.auth.redirectUri.origin ||
    successRedirect.username || successRedirect.password ||
    successRedirect.search || successRedirect.hash) {
    return failure(503, "authentication_unavailable", true);
  }
  try {
    const result = await completeOidcLogin(runtime.callback, new URL(request.url),
      browserBinding, runtime.sessions, runtime.revoker, previousSessionId);
    const headers = new Headers({ ...privateHeaders, Location: successRedirect.href });
    headers.append("Set-Cookie", result.cookie);
    headers.append("Set-Cookie", result.bindingCookie);
    return new Response(null, { status: 303, headers });
  } catch (error) {
    return failure(error instanceof InvalidOidcCallback ? 400 : 503,
      error instanceof InvalidOidcCallback ? "invalid_authentication_response" : "authentication_unavailable", true);
  }
}
