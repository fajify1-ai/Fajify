import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthenticationUnavailable } from "./oidc.server";
import { SESSION_COOKIE_NAME, type ServerSession } from "./session.server";

/** Production composition is deliberately disabled. BLOCKED BY PHASE 1:
 * approved web OIDC configuration and encrypted persistent session/credential/
 * transaction stores. OpenIdClientAdapter is implemented independently; no
 * test store or fake identity is used at runtime.
 */
export const customerIdentityIntegration = {
  status: "blocked",
  reason: "BLOCKED BY PHASE 1",
} as const;

export async function readCustomerSession(): Promise<ServerSession | null> {
  // A forged cookie cannot activate an incomplete provider.
  (await cookies()).get(SESSION_COOKIE_NAME);
  return null;
}

/** Call in each protected Server Component/action and next to data access.
 * The existing public shell remains the only page; no new UI is introduced.
 */
export async function requireCustomerSession(): Promise<ServerSession> {
  const session = await readCustomerSession();
  if (!session) redirect("/");
  return session;
}

export async function beginCustomerSignIn(): Promise<never> {
  throw new AuthenticationUnavailable();
}
