# Milestone 2 — Keycloak identity environment (disposable configuration)

Realm template: `realm-faji-m2.json`. This file includes no credentials. Use a **dedicated identity PostgreSQL database**, never the Faji application DB. Identity-provider records belong to Keycloak. Treat this realm import as a staging/development template; client redirect URIs and deployment hostname require environment-specific review.

The realm enables verified email and reset-password actions; The customer mobile client supports in-app email/username and password sign-in using Direct Access Grants over HTTPS. Only `faji-customer-mobile` enables this grant. Other clients keep Direct Access Grants disabled. Registration, recovery and verification still use system-browser OIDC with Authorization Code + PKCE and registered redirects. Passwords go directly to Keycloak and are never stored or sent to an application API.

The `faji-api` client is a bearer-only audience target; each mobile client maps the `faji-api` audience into access tokens. Realm roles are coarse permissions only. A valid role never grants merchant/branch/dispatch-area ownership without PostgreSQL membership checks.

For disposable acceptance, run Keycloak 26 with temporary identity PostgreSQL, importing this template through `kc.sh import --file /path/to/realm-faji-m2.json` before starting the instance. Configure realm hostname/TLS and email transport separately. **Do not expose start-dev to the public internet**. Verify import errors and actual client settings before accepting.

Required yet unverified integration: browser PKCE flow, verified registration, email recovery, logout/revocation, token refresh and rotation, MFA for privileged roles, realm/client mapper output, session policy, throttling and secure audit. The server access-token signature verifier alone does not prove these functions.

Customer mobile in-app sign-in: existing realms must enable **Direct access grants** on `faji-customer-mobile` in Keycloak. Updating the import JSON does not update an already imported realm. Keep verified email, brute-force protection and API account verification enabled. Accounts requiring setup must finish setup through the existing browser flows before password sign-in.
