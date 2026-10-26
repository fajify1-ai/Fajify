# Phase 1 — Milestone 2: Authentication and account lifecycle contracts

**Implementation branch:** `feat/m2-d1-keycloak-auth-authorization`. **Acceptance:** pending consolidated tests. Do not merge into `main` or use for production credentials until the end-to-end gate succeeds.

## Mobile authentication

Clients `faji-customer-mobile`, `faji-business-mobile`, and `faji-ride-mobile` use Keycloak's Authorization Code flow with mandatory S256 PKCE. Apps should use the system browser, not collect passwords in the backend. Redirects must exactly match their realm client configuration.

- Realm: `faji`
- OIDC discovery: `{KEYCLOAK_ISSUER}/.well-known/openid-configuration`
- Backend API audience: `faji-api`
- Customer redirect: `com.faji.customer:/oauth/callback`
- Business redirect: `com.faji.business:/oauth/callback`
- Ride redirect: `com.faji.ride:/oauth/callback`

## Backend API contracts

All endpoints use URI version 1 with `/api/v1` prefix.

| Method | Endpoint | Authorization | Behavior |
|---|---|---|---|
| GET | `/auth/me` | Valid access token + active PostgreSQL account | Returns `{subject, roles}`; missing/pending/suspended accounts denied |
| POST | `/auth/enroll` | Valid access token | Provisions only JWT subject as **suspended/pending** in the Fajify database; responds `{subject,status:"pending_approval"}` |
| POST | `/admin/accounts/:subject/suspension` | Active platform-admin + recent Keycloak MFA ACR | Request body `{suspended:boolean}`; approval uses `false`, suspension uses `true` |

For account enrollment the request body is ignored; the account's identity comes exclusively from the verified bearer token. Never accept user-provided subject or role during enrollment. Enrollment is not authentication; it only creates a pending profile.

## Security obligations and acceptance gaps

1. **MFA:** A backend guard checks `platform-admin`, `acr=faji-mfa`, and `auth_time` within 300 seconds. This is NOT proof that Keycloak actually enforces OTP. The realm must implement an enforced step-up flow and demonstrate it live; all admin API operations are unusable without the configured claim.
2. **Revocation:** Account suspension sets `revoked_after` transactionally in PostgreSQL. Existing signed tokens must be rejected at `/auth/me`, even after reinstatement. Unit and database-backed HTTP gates have been committed but are pending a consolidated execution. Identity provider logout/token revocation is a separate requirement.
3. **Approval:** New accounts are suspended until a privileged decision. The generic administrative endpoint is not a complete business KYC/approval workflow; merchant ownership must be checked independently.
4. **Audit and isolation:** Suspension, reinstatement, provisioning and membership changes must be recorded. Tenant/resource guards must be applied to every future domain route, then exercised across tenants.
5. **Operations:** Throttling, security monitoring, final migrations, real Keycloak JWT-to-API tests and full disposable acceptance must pass on one pinned commit.

## Test posture

Historical customer registration/email/PKCE/password-recovery lifecycle acceptance passed against Keycloak 26.8.1 at `5e831b4`. New API work has not yet passed the consolidated gate. Do not mark Phase 1 — Milestone 2 complete from earlier partial evidence.
