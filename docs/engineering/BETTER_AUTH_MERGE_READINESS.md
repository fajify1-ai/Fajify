# Better Auth — pre-launch finalization and merge readiness

Date: 2026-11-16 (Africa/Lagos). Branch: `feat/better-auth-nextjs-in-app`. Verified implementation: **`01fa5ed4fa5b9d1e4680e3bb71447adf21687d03`**. Reconciled `main`: `4162bd572e6b4e9cd6351d7e1e1e909a09bcda70` (PR #26). Previous verified baseline: `361657b78ede429ff322a144e813161179aa5496`.

## Decision and scope

Fajify is pre-launch and has no real users. Better Auth is the sole authentication provider across Customer, Business, Admin and Ride/Dispatch. Legacy identity imports, account claiming, password conversion and Keycloak-specific rollback are unnecessary and removed from active flows/checklists. Normal database migrations, backups, restore verification, secret escrow and safe application rollback remain required.

**Local integration: PASS. Merge readiness: pending the PR integration check.** The PR must be conflict-free with passing integration checks and no critical findings before merging. Deployment/mobile release readiness is separate: no public deployment or native release is authorized or claimed by merging application code.

## Keycloak removal audit

Reviewed the actual Git checkout and dependency manifests/lockfiles, API identity providers/guards, Flutter clients, all four Next.js apps, Docker/ingress/env/scripts, tests and documentation. Runtime scans used word boundaries for `keycloak`, `oidc`, `pkce`, plus configuration names `KEYCLOAK`, `OIDC_`, `KC_`, `AUTH_ISSUER` and known package/adapter names. `VoidCallback` is not an OIDC reference.

| Area | Finding / final state |
| --- | --- |
| NestJS runtime | Better Auth/Drizzle is the only registered identity verifier. No Keycloak/JWKS/OIDC adapter, issuer environment requirement or hosted redirect. Backend roles, resource scopes, suspension, revocation and administrative step-up remain enforced. |
| Next.js | Four embedded auth apps use `packages/web_auth`; no Keycloak clients, callback transactions or hosted login dependencies. Removed account-claim routes and shared form mode. |
| Flutter | Removed unused browser/OIDC journey interfaces, controller methods and their obsolete fake-provider tests. In-app Better Auth login/recovery/MFA and secure bearer storage remain. Removed shared claim method/UI. Customer recovery no longer offers browser mode. No external-browser auth package remains. |
| Dependencies | No Keycloak, flutter_appauth or OIDC client package is required. Cryptographic dependencies used by Better Auth are not additional providers. |
| Docker/deployment | No identity server/realm/identity database service exists. Kept infrastructure/keycloak deleted when reconciling PR #26. Private staging uses API, web, application PostgreSQL/PostGIS and Redis only. |
| Environment/setup | Removed the last OIDC config filename in Android tooling and ignore rules. Added public-only `auth-config.example.json`. Updated Customer/Business/web setup docs. Runtime needs only owned API/web origins and Better Auth secrets; provider credentials stay server-side. |
| Legacy claims | Removed API endpoint/service, owner CLI, web/mobile UI, grants and runbook. Additive 0108 drops claim tables, consumer function and credential guard and restores registration-only provisioning. Prior migrations/checksums remain immutable. A regression test verifies endpoint 404 and absence of claim tables/functions. |
| Tests | Provider-neutral fake identities remain for authorization isolation tests; they never authenticate application users. Updated stale issuer examples/test labels. Removed 18 obsolete browser/OIDC fake-provider Customer tests; preserved current security tests. |
| SQL history | Prior migration comments and 0105 claim definitions remain immutable evidence, not active dependencies. 0108 explicitly retires that schema. |
| Historical documents | Dated milestone/OIDC/Keycloak reports retain factual history and supersession notices. Earlier release report is explicitly historical and its legacy-account gates are superseded. Current architecture, setup and staging docs take precedence. |

No active application requires Keycloak to start, authenticate or authorize. No unrelated database or deployed service was accessed. Only the existing marked disposable test database was resumed and updated; no new cluster or acceptance stack was recreated.

## Verification

[Committed evidence](BETTER_AUTH_MERGE_EVIDENCE.json) records outcomes and log fingerprints. Earlier [browser evidence](BETTER_AUTH_TEST_EVIDENCE.json) and [historical report](BETTER_AUTH_RELEASE_ACCEPTANCE.md) are retained. Cookie/proxy/MFA/session implementation is unchanged except removal of unused claim branches, so the successful full Chromium/TLS suite was not repeated. Modified shared forms were rebuilt and exercised by standalone HTTP checks; API identity/security integration was rerun.

| Check | Result |
| --- | --- |
| Main integration | PASS: PR #26 architecture reconciled by merge commit; no application features from other feature branches imported |
| Root lint / typecheck | PASS: 6 / 7 tasks |
| Node tests | PASS: 171 API + 3 worker + 5 proxy = 179 |
| Production builds | PASS: NestJS, worker, Customer/Admin/Business/Ride Next.js |
| Exact deployment Node version compatibility | PASS: Node 22.23.5 boots production-only API package with restricted database role, health/readiness, registration/profile and protected API checks |
| Four standalone apps on Node 22 | PASS: login renders, claim route returns 404, unauthenticated dashboard redirects to login |
| PostgreSQL 16.16/PostGIS 3.6.4 | PASS: existing disposable DB applies 0108; all 43 migration checksums/metadata and least-privilege checks pass (11 tests) |
| Authentication/authorization integration | PASS: 6 PostgreSQL tests for optional MFA, phone abuse/recovery, administrative password proof/scopes, credential/session rotation and retired claims |
| Flutter analysis | PASS for three apps/core with `--no-fatal-infos`; deprecation information only |
| Flutter host tests | PASS: Customer 49, Business 43, Ride/Dispatch 3, core 9 = 104. Customer demo navigation tests explicitly use `--dart-define=USE_MOCK_SERVICES=true`. |
| OpenAPI | PASS: claim removed; step-up body schema documented; existing unrelated domain contracts preserved |
| Retained browser/TLS acceptance | PASS at previous verified revision: all four apps' registration/login/logout/recovery/reset/expiry/cookie/CSRF/MFA/phone/isolation scenarios |
| Retained backup/recovery rehearsal | PASS at previous revision: full content/ledger restore. Backup scripts enumerate tables dynamically and are unchanged; no unnecessary repeat restore performed. |

A first lint run encountered stale generated claim-route types; rebuilding regenerated the types and rerun passed. Concurrent local builds briefly exhausted the small workspace; only generated artifacts were cleared, checks were rerun sequentially and passed. No security rule was relaxed to fix checks.

## Release boundaries and remaining work

- Android/iOS device storage, lifecycle, real transport/UI acceptance and native release builds remain **unexecuted** because no mobile SDK/emulator/device is available. Host tests are not device evidence; use [reproducible device commands](../../tests/auth/README.md) before a mobile release.
- No real SMTP/SMS provider delivery was executed. Approve sandbox credentials and test delivery/expiry/budgets before exposing registration/recovery publicly. Authentication fails closed when delivery is unavailable.
- Full staging Docker image build/startup remains unexecuted in this constrained vfs workspace. Node 22 production package/standalone compatibility is now verified; actual PostGIS 16-3.4 image, secrets/SCRAM, Redis/restarts, DNS/TLS and ingress operations still require private staging acceptance. Existing Compose/nginx configuration evidence is retained.
- The previous audit had zero critical/high/moderate findings and one low deepmerge version advisory, locally patched with a regression test. Retain the patch until an upstream fix is adopted; it is not suppressed.
- MFA stays optional for all roles. Enrolled factors and recent password/factor proof are enforced for privileged actions; administrative scopes, tenant checks and suspension controls were preserved.

These are mobile/public deployment release gates, not legacy-migration blockers. This PR prepares the pre-launch development baseline; it does not claim a production release or remove operational safeguards. If GitHub integration cannot run/pass or reports a critical finding, leave the PR unmerged and report the blocker.
