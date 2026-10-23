# Developer 1 — Milestone 1 verification and acceptance

Date: 23 October 2026 (Africa/Lagos).
Branch: `feat/m1-d1-backend-foundation`.
Verified implementation: `3ad5f88` (lockfile and verification fixes), plus the SIGTERM expectation correction committed with this report and generated OpenAPI evidence.

**Decision: acceptance pending. Do not merge as accepted or begin Developer 1 Milestone 2.** The user explicitly deferred database acceptance; no disposable PostgreSQL/PostGIS connection was supplied. No Flutter, Android SDK or Docker was installed or run.

## Verification environment and command

Node.js 22.23.2, Corepack 0.34.6, pnpm 9.15.9. Dependencies were installed once initially; remediation fetched only changed dependencies, and the final run used the frozen lockfile and cached install. Redis was an isolated loopback-only instance on port 16379 with persistence disabled. No existing Redis data was used.

```bash
REDIS_URL=redis://127.0.0.1:16379 bash tooling/verify-d1-m1.sh
```

The Redis instance must be started before reproducing this command. It is temporary and stopped after verification. Raw local execution logs: `/tmp/fajify-m1-final-verification.log`; corrected smoke log: `/tmp/fajify-m1-final-smoke.log`; final audit log: `/tmp/fajify-m1-final-audit.log`; structured audit evidence: `/tmp/fajify-m1-final-audit.json`. These temporary files are not durable repository artifacts; results are recorded below.

## Gates

| Gate | Result |
| --- | --- |
| Frozen dependency installation | PASS |
| API typecheck, lint and build | PASS |
| API authentication, configuration and HTTP tests | PASS: 13 tests |
| Worker typecheck, lint and build | PASS |
| Worker unit tests | PASS: 3 tests |
| Database TypeScript check | PASS |
| Redis queue deduplication, worker success, retained failure and clean connection shutdown | PASS: 2 tests in consolidated run |
| OpenAPI generation and both versioned health paths | PASS; generated contract committed |
| Compiled API startup, liveness, unavailable-database readiness, error envelope and graceful shutdown | PASS after correcting harness SIGTERM expectation |
| Workspace-wide dependency audit at high severity | PASS: zero vulnerabilities at every severity |
| Workspace structure check | PASS; this does not imply app acceptance |
| Tracked secret filename and private-key/GitHub-token/AWS-key pattern checks | PASS; limited pattern scan, not a comprehensive secret audit |
| PostgreSQL/PostGIS migration, migration rerun, database operations and live readiness | NOT RUN; acceptance blocker |

The consolidated run passed through contract generation, then stopped at an incorrect smoke-harness exit-code assertion. Nest completes shutdown hooks and re-sends SIGTERM, producing a signal exit rather than code 0. After correcting that expectation, the compiled API smoke check and final audit were rerun successfully. Earlier passing gates were not repeated. Full Milestone 1 acceptance remains pending independently of this harness correction.

## Corrections made

- Committed the workspace lockfile. Updated Drizzle ORM to the patched 0.45 series; constrained Next's PostCSS and Swagger's js-yaml to patched versions. Updated Nest CLI's webpack dependency to satisfy its transitive peer requirement. The audit covers all workspace packages, including web dependencies; web builds are outside this backend run.
- Restricted the insecure local issuer exception to HTTP with the exact `localhost` hostname. Added hostile hostname/path/protocol regression cases and tested the actual M1 identity module's deny-closed provider.
- Applied request context through common API setup so the HTTP fixture and compiled application exercise the same middleware. Delayed AppModule import until bootstrap to prevent configuration side effects during test imports.
- Passed Redis connection options to BullMQ so it owns and closes clients. Previously the integration assertion passed but the test process timed out due to open sockets. Added processing/failure integration coverage and URL parsing regression tests.
- Added compiled API process smoke verification and contract generation with explicit local placeholder defaults. These defaults do not prove Keycloak, S3 or database connectivity. Added `--acceptance`, which exits 2 if service gates are skipped.

## Merge review and remaining acceptance work

`origin/main` is an ancestor of this branch, but the branch includes earlier workspace scaffolding and customer Flutter import work (393 files before these fixes). Review that inherited scope alongside Developer 1 changes; this is not a backend-only diff. No merge or remote push was performed.

To close acceptance, supply an isolated application PostgreSQL database with PostGIS available, never the Keycloak database. Export `FAJI_DATABASE_URL` and an isolated `REDIS_URL`, then run:

```bash
bash tooling/verify-d1-m1.sh --acceptance
```

Verify migration reruns preserve the migration ledger and data, and exercise profile uniqueness, audit/outbox writes and rollback behavior against the disposable database; current database integration coverage only checks extension/table creation. Expand those integration assertions before final acceptance. Record the exact commit and successful full-run evidence, review the final branch, and only then merge and start Developer 1 Milestone 2.

Live JWT/JWKS validation belongs to Milestone 2. M1 deliberately rejects bearer tokens through its default verifier, and notification delivery remains unconfigured; tested handlers prove worker mechanics, not external notification delivery.
