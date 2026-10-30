import "server-only";

/** Phase 1 /auth/me contract, not a display profile or token claim schema. */
export interface CurrentCustomerIdentity {
  readonly subject: string;
  readonly roles: readonly string[];
}

export class CustomerIdentityFailure extends Error {
  constructor(readonly code: "session_invalid" | "access_denied" | "unavailable") {
    super("Customer account verification could not be completed");
  }
}

/** Server-side only. Use the verified provider subject, never a browser-supplied
 * subject/token. No cache or redirect may bypass active-account verification.
 * Production composition still requires approved API origin and OIDC adapter.
 */
export class CustomerIdentityClient {
  private readonly endpoint: URL;

  constructor(apiOrigin: URL, private readonly request: typeof fetch = fetch) {
    if (
      apiOrigin.protocol !== "https:" || !apiOrigin.hostname ||
      apiOrigin.username || apiOrigin.password || apiOrigin.search ||
      apiOrigin.hash || apiOrigin.pathname !== "/"
    ) throw new Error("A reviewed HTTPS API origin is required");
    this.endpoint = new URL("/api/v1/auth/me", apiOrigin);
  }

  async load(accessToken: string, expectedSubject: string): Promise<CurrentCustomerIdentity> {
    if (!/^[A-Za-z0-9._~+/-]+=*$/.test(accessToken) ||
      accessToken.length > 16384 || !expectedSubject.trim()) {
      throw new CustomerIdentityFailure("session_invalid");
    }
    try {
      const response = await this.request(this.endpoint, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 401) throw new CustomerIdentityFailure("session_invalid");
      if (response.status === 403) throw new CustomerIdentityFailure("access_denied");
      if (response.status !== 200 ||
        response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json" ||
        !response.body) throw new CustomerIdentityFailure("unavailable");

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 65536) throw new CustomerIdentityFailure("unavailable");
          chunks.push(value);
        }
      } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!value || typeof value !== "object" ||
        !("subject" in value) || value.subject !== expectedSubject ||
        !("roles" in value) || !Array.isArray(value.roles) ||
        !value.roles.every((role: unknown) => typeof role === "string" && role.trim().length > 0)) {
        throw new CustomerIdentityFailure("unavailable");
      }
      if (!value.roles.includes("customer")) throw new CustomerIdentityFailure("access_denied");
      return Object.freeze({ subject: expectedSubject, roles: Object.freeze([...value.roles]) });
    } catch (error) {
      if (error instanceof CustomerIdentityFailure) throw error;
      // No provider response, bearer token or fetch diagnostics escape.
      throw new CustomerIdentityFailure("unavailable");
    }
  }
}
