import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthenticationUnavailable } from "./oidc.server";
import { SESSION_COOKIE_NAME, type ServerSession } from "./session.server";
import { getCustomerWebRuntime } from "./deployment.server";

/** Live deployment remains blocked until approved configuration is supplied.
 * Routes and Server Components share the same gated persistent runtime. */
export const customerIdentityIntegration = {
  status: "blocked",
  reason: "BLOCKED BY PHASE 1",
} as const;

export async function readCustomerSession(): Promise<ServerSession | null> {
  const runtime = await getCustomerWebRuntime();
  if (!runtime) return null;
  try { return await runtime.sessions.read((await cookies()).get(SESSION_COOKIE_NAME)?.value); }
  catch { return null; }
}

/** Call in each protected Server Component/action and next to data access.
 * The existing public shell remains the only page; no new UI is introduced.
 */
export async function requireCustomerSession(): Promise<ServerSession> {
  const session = await readCustomerSession();
  if (!session) redirect("/");
  return session;
}

/** Initiation must POST to /api/auth/login through the exact-Origin guard.
 * This legacy helper is not an alternate Server Action or GET login endpoint. */
export async function beginCustomerSignIn(): Promise<never> {
  throw new AuthenticationUnavailable();
}
