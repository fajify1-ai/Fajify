# Phase 1 handoff checklist for customer authentication

Deployment values are still pending. This checklist distinguishes merged template
evidence from deployed approval. Keep both customer activation flags false until
the values, policies and test deployment are reviewed. Send secret references through
the team's secret manager, never chat, tracked files or NEXT_PUBLIC_ variables.

Evidence: `infrastructure/keycloak/realm-faji-m2.json`,
`docs/engineering/PHASE_1_MILESTONE_2_AUTH_CONTRACTS.md`,
`apps/api/src/auth/session.controller.ts`.

| Item | Confirmed repository contract | Phase 1 must supply/confirm |
| --- | --- | --- |
| Issuer | Realm `faji`; discovery from issuer | Exact environment HTTPS issuer, reachable discovery/JWKS/UserInfo and matching token issuer |
| API | Audience `faji-api`; URI version `/api/v1` | HTTPS origin only, deployment availability, trusted certificates and audience mapping for both customer clients |
| Mobile client | `faji-customer-mobile`, public, code flow, S256 mandatory, direct grants/implicit disabled | Confirm these values are provisioned in the intended environment; no native client secret |
| Mobile callback | `com.faji.customer:/oauth/callback` | Confirm exact redirect allowlist and installed app ownership; no wildcards |
| Mobile logout | No explicit post-logout allowlist in merged mobile template | Approve logout URI/provider end-session behavior; current native adapter requires the same URI as callback |
| Scopes | Mobile defaults include roles/profile/email; adapter requires openid/email | Exact requested scope strings for each client; role and verified-email claims; no invented offline_access |
| Customer web client | Absent from merged realm; admin client is NOT a substitute | Dedicated confidential customer client ID, server secret reference/auth method, code+PKCE and `faji-api` audience mapping |
| Web callback | New local handler `/api/auth/callback` | Approve exact customer HTTPS origin plus that path in Keycloak; adapter rejects other callback paths |
| Web logout | Local POST `/api/auth/logout`; provider token revocation reused | Exact same-origin post-logout URL and approved RP/SSO logout expectations; do not assume token revocation clears the provider browser SSO cookie |
| Email | Template permits registration/login with email, verifyEmail and password reset; no SMTP server in merged realm | SMTP host/port/TLS/from-address and secret references, delivery proof, verify/reset action expiry and link policies |
| Account approval | `/auth/enroll` provisions JWT subject as pending/suspended; `/auth/me` requires active account | Enrollment ownership/workflow and test-account approval process; no client-granted roles/approval |
| Session policies | Template access token 300s; SSO idle 1800s/max 28800s | Reviewed web session and transaction TTLs; refresh rotation/reuse/revocation policies, logout/suspension and clock-skew expectations |
| Web storage | Real isolated PostgreSQL adapter verified | Dedicated TLS database, runtime DML-only grants, migrated schema, CA if needed, pool/timeouts, active key ID plus retained key ring, rotation/backup/cleanup ownership |
| Profile | `/api/v1/auth/me` returns only `{subject, roles}` | Publish additional DTO fields before UI uses name/avatar/phone; do not infer them from template scopes |

Required live identities, delivered through secure account provisioning:

- Two separate active, verified customers A/B for ownership isolation.
- Unverified email and pending-approval customers; suspended customer.
- Non-customer identity; token issued before suspension/reinstatement cutoff.
- A recoverable test mailbox; ability to demonstrate one-time/expired reset and
  verification links, old-password rejection and revocation/refresh rotation.
- An authorized admin/operator for approval setup; no admin credentials in apps.

Web server environment names are documented in `apps/customer_web/.env.example`.
Public mobile names are in `NativeOidcSettings.fromEnvironment()`. Do not use the
loopback Keycloak acceptance URLs or synthetic fixtures as deployment values.
No real Keycloak/SMTP/API endpoint was accessed in this milestone.
