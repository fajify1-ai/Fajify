# Developer 1 — Milestone 2 disposable database acceptance

**Not yet executed.** Run `bash tooling/run-d1-m2-database-disposable.sh` on the feature branch after PostgreSQL 16/PostGIS and pnpm dependencies are available. No Docker or existing PostgreSQL cluster is used.

The script creates a private cluster and disposable application database, applies forward migrations 0001 and 0002, then checks provisioning, suspension, membership isolation, audit records and denied schema/migration-ledger modifications from the runtime principal. Cleanup runs on exit. The existing Milestone 1 integration suite is intentionally separate.

**Keycloak live acceptance remains pending.** This database runner does not test PKCE, OIDC session refresh/logout, email verification, recovery, MFA or Keycloak's separate PostgreSQL identity store. Those cannot be claimed from passing API/database tests. Do not merge M2 based on this runner alone.
