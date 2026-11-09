# Identity Infrastructure

OIDC and RBAC configuration; no live secrets in Git.

**Status:** planned module; no implementation has been merged.

Customer mobile in-app sign-in: existing realms must enable **Direct access grants** on `faji-customer-mobile` in Keycloak. Updating the import JSON does not update an already imported realm. Keep verified email, brute-force protection and API account verification enabled. Accounts requiring setup must finish setup through the existing browser flows before password sign-in.
