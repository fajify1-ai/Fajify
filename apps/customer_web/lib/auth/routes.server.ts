import "server-only";
import { NextRequest } from "next/server";
import { CUSTOMER_CALLBACK_PATH, getCustomerWebRuntime } from "./deployment.server";
import { beginCustomerJourney, completeCustomerJourney, type CustomerWebJourneyRuntime } from "./journey-http.server";
import { logoutCustomer, withCustomerSession } from "./http.server";
import { OIDC_BINDING_COOKIE, expiredOidcBindingCookie, type CustomerWebJourney } from "./openid-client.server";
import { SESSION_COOKIE_NAME, expiredSessionCookie } from "./session.server";

const privateHeaders = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const unavailable = () => Response.json({ code: "authentication_unavailable" }, { status: 503, headers: privateHeaders });

/** Inject only a trusted server runtime in tests. Browser requests cannot select
 * providers, return URLs, subjects, credentials or authentication configuration. */
export function createCustomerAuthRoutes(resolve = getCustomerWebRuntime) {
  const runtime = async (): Promise<CustomerWebJourneyRuntime | null> => {
    try {
      const value = await resolve();
      return value?.settings.auth.redirectUri.pathname === CUSTOMER_CALLBACK_PATH ? value : null;
    } catch { return null; }
  };
  const cookie = (request: Request, name: string): string | undefined => {
    // Ambiguous duplicate cookies fail closed rather than selecting one by order.
    const raw = request.headers.get("cookie") ?? "";
    if (raw.split(";").filter(part => part.trim().split("=")[0] === name).length > 1) return undefined;
    return new NextRequest(request).cookies.get(name)?.value;
  };
  const start = (journey: CustomerWebJourney) => async (request: Request) =>
    beginCustomerJourney(request, await runtime(), journey);
  return {
    login: start("signIn"), registration: start("registration"), recovery: start("recovery"), verification: start("verifyEmail"),
    callback: async (request: Request) => {
      if (request.method !== "GET") return new Response(null, { status: 405, headers: { ...privateHeaders, Allow: "GET" } });
      const value = await runtime();
      if (!value) {
        const response = unavailable();
        response.headers.append("Set-Cookie", expiredOidcBindingCookie());
        return response;
      }
      const target = new URL("/", value.settings.auth.redirectUri);
      return completeCustomerJourney(request, value, cookie(request, OIDC_BINDING_COOKIE), target,
        cookie(request, SESSION_COOKIE_NAME));
    },
    logout: async (request: Request) => {
      const value = await runtime();
      if (!value) {
        if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...privateHeaders, Allow: "POST" } });
        // Disabled deployments cannot authorize a mutation, but can expire only
        // local cookies; do not claim provider revocation or successful logout.
        const response = unavailable();
        response.headers.append("Set-Cookie", expiredSessionCookie());
        response.headers.append("Set-Cookie", expiredOidcBindingCookie());
        return response;
      }
      const response = await logoutCustomer(request, cookie(request, SESSION_COOKIE_NAME), value.sessions,
        value.settings.auth.redirectUri.origin);
      response.headers.set("Referrer-Policy", "no-referrer");
      if (response.status === 204 || response.status === 503) response.headers.append("Set-Cookie", expiredOidcBindingCookie());
      return response;
    },
    session: async (request: Request) => {
      if (request.method !== "GET") return new Response(null, { status: 405, headers: { ...privateHeaders, Allow: "GET" } });
      const value = await runtime();
      if (!value) return unavailable();
      return withCustomerSession(cookie(request, SESSION_COOKIE_NAME), value.sessions,
        async () => Response.json({ authenticated: true }, { headers: privateHeaders }));
    },
  };
}

export const customerAuthRoutes = createCustomerAuthRoutes();
