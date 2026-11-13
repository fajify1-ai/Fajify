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

## Operations console

The operator lands on Operations overview after sign-in. Navigation connects the following views. The API checks each grant independently.

| View | Reads | Commands |
| --- | --- | --- |
| Operations overview | `operations.read` | |
| Merchant applications | `governance.read` | Existing privileged review guard |
| Support | `support.read` | `support.write` for assignment, reply, close and reopen |
| Finance | `finance.read` | |
| Reports | `reports.read` and `finance.read` | |
| Monitoring | `monitoring.read` | `incidents.write` for manual checks, acknowledgements and incident management |
| Audit log | `audit.read` | |

Finance displays captures, refunds, settlements and reconciled ride payouts as separate measures. Reports use the server's rolling date windows and can retrieve a merchant report by its UUID. Monitoring shows external provider health as unverified until the backend has provider evidence. Navigation is visible to signed-in operators and restricted reads and commands return access-denied states.

Before production rollout, verify the Azure dev MFA and physical Business APK acceptance above. Also exercise every console route with least-privilege read-only and write-enabled operators, including denial, expired MFA, concurrent decisions and replay. For multi-instance deployment, replace the process-local session and OIDC transaction stores with shared server-side storage.

## Vercel dev preview

Use a separate Vercel project with root directory `apps/admin_web`, the Next.js preset, and Node 22.x. Include workspace files outside the root so Vercel can use the root pnpm lockfile. Deploy the admin branch as a preview.

- Set `FAJI_ADMIN_WEB_ORIGIN` to the exact HTTPS preview origin you will open in the browser. Use a stable preview alias and set it before the acceptance build.
- Set `FAJI_ADMIN_API_ORIGIN=https://fajify-dev.eastus.cloudapp.azure.com` and `FAJI_ADMIN_OIDC_ISSUER=https://fajify-dev.eastus.cloudapp.azure.com/realms/faji`.
- Provision a dedicated dev Upstash Redis database and set `UPSTASH_REDIS_REST_URL` and the read/write `UPSTASH_REDIS_REST_TOKEN` as server-only Preview variables. Redis stores short-lived sessions and consumes each login transaction atomically. Vercel requires this shared storage. Single-process Azure deployments can continue using memory.
- In Azure dev Keycloak, append the preview origin plus `/auth/callback` to the `faji-admin-web` redirect URIs and the preview origin plus `/` to its post-logout redirect URIs. Keep existing entries and MFA. Open the preview in Android Chrome and complete sign-in before testing merchant approval.
