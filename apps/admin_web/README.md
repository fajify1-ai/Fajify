# Faji Admin

The Merchant Applications queue displays pending Faji Business applications and submits approval or rejection through the existing API. It uses the queue's display name, submission date (WAT) and application ID.

## Run in Azure dev

1. Deploy `@faji/admin-web` with the workspace's pinned Node and pnpm setup (Node 22.12+). Set the server environment variables from [.env.example](.env.example). Set the dashboard and API to their exact HTTPS origins and use the exact Keycloak issuer configured in the API. Build with `corepack pnpm --filter @faji/admin-web build` and serve with `corepack pnpm --filter @faji/admin-web start` behind trusted TLS.
2. On the existing public `faji-admin-web` client, add the exact dashboard `/auth/callback` HTTPS URL to **Valid Redirect URIs** and the dashboard root URL (including trailing slash) to **Valid Post Logout Redirect URIs**. Retain the existing acceptance callback if still used. Keep Authorization Code, S256 PKCE and the `faji-api` audience mapper. Verify the client's Browser Flow override is bound to the live `faji-admin-browser` flow UUID with required password and OTP, and that the signed access token has the configured MFA ACR and recent `auth_time`. The realm template defines the flow and the existing Keycloak lifecycle tooling demonstrates binding its runtime UUID.
3. Run one persistent Node process for this first dev release. OIDC transactions and short-lived sessions live in bounded process memory. A restart invalidates them, and a multi-instance or serverless deployment requires a shared server-side store. The browser receives only opaque cookies. Elevated sessions expire at the earlier of token expiry and five minutes from MFA. The dashboard starts a fresh Keycloak login when elevation expires. Sign-out invalidates the dashboard session and opens Keycloak's logout confirmation.
4. Use an active, independently verified Azure dev operator with the `platform-admin` role and enrolled MFA. The queue is `GET /api/v1/admin/governance/approvals?limit=20&offset=0` and requires `governance.read`. If that grant is missing, follow the [M8 operator runbook](../../docs/operations/M8_ADMIN_OPERATIONS.md) for two-person approval and an out-of-band operator grant. The review command is `POST /api/v1/business/onboarding/:id/review` with `{"decision":"approved"}` or `{"decision":"rejected"}`. It independently checks active identity, privileged client/role/MFA and rate limits. It does not require `governance.write`.
5. In the installed Android Business APK, sign in as a synthetic merchant and submit a uniquely named pending application. Verify a nonprivileged synthetic account receives HTTP 403 from the review API for that application and that it remains pending. Sign in to the dashboard with the dev operator and MFA, find the same name and ID, approve it, and confirm the queue refreshes. On the same APK, sign out and sign back in as that merchant. Confirm the live workspace opens. Use a separate synthetic application to test rejection. Record the commit, outcomes and application IDs without recording credentials, tokens, OTPs or real customer data.

Configure ingress and APM to omit auth callback query strings, authorization headers, cookies and token request/response bodies from logs.

## Local checks

```sh
corepack pnpm --filter @faji/admin-web lint
corepack pnpm --filter @faji/admin-web typecheck
corepack pnpm --filter @faji/admin-web build
corepack pnpm --filter @faji/admin-web test
```
