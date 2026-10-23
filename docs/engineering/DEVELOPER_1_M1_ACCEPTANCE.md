# Developer 1 — Milestone 1 final acceptance

Date: 23 October 2026 (Africa/Lagos). Branch: `feat/m1-d1-backend-foundation`.

**Decision: ACCEPTED — Developer 1 Milestone 1.** No push, merge or Milestone 2 implementation is authorized by this acceptance work.

Implementation under verification: **`79a55313213f4dbe0de6918c2ae1622b9d59fdde`**. The final documentation/evidence commit contains no additional implementation changes. Prior local commits `3ad5f88` and `8e8c0d6` remain intact.

## Environment and evidence

- PostgreSQL **16.15**, Ubuntu build `16.15-0ubuntu0.24.04.1`.
- PostGIS **3.6.4**, Drizzle ORM **0.45.4**, GEOS **3.14.1**, PROJ **9.8.1**.
- Node.js **22.23.2**, Corepack **0.34.6**, pnpm **9.15.9**.
- A newly initialized, private local PostgreSQL cluster with SCRAM passwords, random loopback port, private Unix socket directory, 32 MB shared buffers and 15 maximum connections. Application database name: unique `fajify_m1_test_<random>`; server-side comment: `fajify:m1:disposable`.
- PostgreSQL binaries were reused from the existing installation. PostGIS and missing native libraries were unpacked into `/tmp/fajify-m1-db-bootstrap`; no system package installation, sudo, paid service, Docker, Flutter or Android tooling was used. Package downloads totaled approximately 15 MB, including an unused 0.85 MB GEOS package fetched during dependency inspection.
- A separate loopback-only Redis process used a random port with persistence disabled. No pre-existing database, service, volume or container was modified.

Durable evidence: [complete acceptance run](evidence/d1-m1-2026-10-23.txt) and [missing-service refusal](evidence/d1-m1-safety-2026-10-23.txt). The acceptance log records the exact source commit, individual tests, durations, versions, final migration checksum and cleanup. Logs contain synthetic identifiers and local temporary paths, without credentials.

Reproduce on a host with PostgreSQL 16, PostGIS, Redis, Node and existing workspace dependencies:

```bash
bash tooling/run-d1-m1-disposable.sh
```

For this run's private, relocated installation, the invocation was:

```bash
LD_LIBRARY_PATH=/tmp/fajify-m1-db-bootstrap/usr/lib/x86_64-linux-gnu \
FAJI_PG_BIN=/tmp/fajify-m1-db-bootstrap/usr/lib/postgresql/16/bin \
PROJ_DATA=/tmp/fajify-m1-db-bootstrap/usr/share/proj \
bash tooling/run-d1-m1-disposable.sh
```

The temporary installation is removed after verification, so those override paths must be recreated before using the second command. On Ubuntu, the installation was assembled from `apt-get download` archives for `postgresql-16-postgis-3`, `postgresql-16-postgis-3-scripts`, `libgeos-c1t64`, `libgeos3.14.1`, `libproj25` and `proj-data`; unpacked with `dpkg-deb -x`; supplemented with copies of the existing PG16 executables and links to its share/library files; and given the standard `postgis.control -> postgis-3.control` link. The runner itself never downloads or installs dependencies.

## Database integration results

**11 executed, 11 passed, 0 failed, 0 skipped; duration 3.366 seconds.** All tests ran against real PostgreSQL/PostGIS on the exact implementation commit.

The 11 real database-backed tests cover:

1. Rejection when the explicit disposable database opt-in does not match the server target.
2. PostgreSQL/PostGIS versions and Drizzle schema compatibility: table/column names and types, defaults, nullability, UUID primary keys, unique identity subject, timestamp defaults, indexes and the intentional absence of M1 foreign keys.
3. Ledger names/checksums and unchanged application data/timestamps after rerunning migrations.
4. Rejection of changed historical migration content, using temporary copies rather than editing committed SQL.
5. Deterministic filename ordering, proved by a later fixture migration depending on an earlier one.
6. Atomic rollback of earlier DDL and migration ledger writes when a later migration fails.
7. Drizzle profile create/read/update, UUID and timestamp defaults, audit/outbox writes and commit visibility through the restricted runtime role.
8. Real unique, not-null, varchar length and UUID constraint rejection.
9. Atomic Drizzle transaction rollback across profile, audit and outbox writes.
10. Functional geometry/geography construction, 3-4-5 planar distance, approximately 111,319.49 metres across one equatorial degree, and actual execution using a temporary GiST spatial index.
11. Restricted runtime role, denied schema creation and migration-ledger writes, and denied connection to the separate empty `keycloak_m1_sentinel` database.

Spatial fixtures use synthetic coordinates, a temporary table and rollback. CRUD fixtures are deleted deterministically. Before destroying the cluster, the runner asserts all three application tables contain zero records.

## Migration results

`0001_foundation.sql` is the sole application migration. It creates `user_profiles`, `audit_events`, `outbox_events`, their constraints/indexes, and ensures PostGIS exists. The runner provisions PostGIS as its temporary bootstrap administrator first; the migration role remains a non-superuser. The application migration history was not rewritten and no forward schema correction was necessary.

The baseline ledger checksum is `1d2273d8ec6e9f0f8cc07963a0b81a89b0545c096f25925f3ac5f60a66008095`. The ledger stores a SHA-256 checksum and application timestamp. Re-execution preserves the ledger exactly. Historical-content rejection and failure rollback operate on disposable migration directories; their synthetic ledger entries/tables are removed. The log records the baseline ledger checksum after all tests.

## Regression verification

The final consolidated command exited **0**, including cleanup validation. All listed checks were rerun on the implementation commit rather than inferred from previous reports:

| Gate | Final result |
| --- | --- |
| Frozen lockfile dependency install | PASS |
| API typecheck, lint, build | PASS |
| API authentication/configuration/HTTP tests | PASS: 13/13; 8.507 s |
| Worker typecheck, lint, build | PASS |
| Worker unit tests | PASS: 3/3; 3.329 s |
| Database TypeScript check | PASS |
| Database integration | PASS: 11/11; 3.366 s |
| Redis integration | PASS: 2/2; 2.433 s |
| OpenAPI export and both versioned health paths | PASS |
| Compiled API with real database readiness using runtime credentials | PASS |
| Compiled API with failed connection, sanitized 503 and graceful shutdown | PASS |
| Workspace dependency security audit | PASS: no known vulnerabilities |
| Missing mandatory service URLs | PASS: exit 2 before install or tests |

Total: **29 tests passed, zero failed, zero skipped**, plus two compiled API smoke runs and the safety checks. The first development run was invalidated by edits to its running wrapper; the final committed-source run is the authoritative evidence.

## Security and isolation

- Environment variables carry generated passwords; the sole temporary password file has mode 0600 inside a mode 0700 directory. No secrets, dumps or disposable records are committed. Dynamic data values use Drizzle or PostgreSQL query parameters; the one runtime-role identifier is checked against a strict identifier allowlist before interpolation.
- Before migration or integration writes, the consolidated script requires a uniquely named, explicitly opted-in database, matching server-side disposable marker and PostgreSQL major version 16. The suite independently validates both migration and runtime targets and requires the same server/database with different roles. Missing required integration configuration fails rather than skips.
- Bootstrap administrator, migration owner and runtime login are separate. Runtime has only connection/temp-table, schema usage and CRUD on the three application tables; it cannot create public schema objects, update the migration ledger or connect to the identity sentinel. The migration owner is not a superuser; PostGIS installation is a bootstrap operation.
- The identity sentinel is an empty database created inside this private cluster, not a real Keycloak installation. Tests prove the configured database privilege boundary; no deployed Keycloak database or credentials were inspected. Production provisioning must independently enforce equivalent `CONNECT` restrictions and runtime grants; the disposable runner is not production IAM automation.
- The compiled API is tested with a healthy runtime database connection and a deliberately unreachable connection. Error responses contain the stable 503 envelope without connection strings/passwords. Migration CLI failures now print a generic diagnostic, and pool cleanup includes failed initial connections.
- A separate migration CLI failure-path check used an unreachable loopback target and a synthetic credential canary: it exited with failure, released the pool and withheld the canary/connection string. A scoped scan of changed files and evidence found no private-key, GitHub-token, AWS-key or generated database-credential patterns; this is not a comprehensive secret audit.
- The fail-closed identity module remains unchanged. Live Keycloak/JWKS authentication and notification delivery remain outside M1.

## Changes and review

Implementation commit `79a5531` changes only Developer 1 database/testing scope:

- `packages/database/scripts/migrate.ts`: export the existing transactional runner for real integration tests, ensure CLI pool cleanup on connection failure, sanitize CLI diagnostics.
- `packages/database/scripts/disposable-target.ts`: read-only target validation.
- `packages/database/test/migration.test.ts`: replace the one optional table-existence test with 11 mandatory real database tests.
- `tooling/run-d1-m1-disposable.sh`: provision, verify and destroy an isolated PG16/PostGIS/Redis environment with separate roles and an identity sentinel.
- `tooling/verify-d1-m1.sh`: refuse missing mandatory services early, preflight database safety, run real database and regression gates.
- `tooling/smoke-d1-m1.mjs`: use runtime credentials for healthy readiness and exercise a sanitized unavailable-database response.

No SQL schema correction, dependency change, production business feature or unrelated workspace change was required. The branch includes inherited workspace scaffolding and customer Flutter import history; review that wider diff before any future merge. Nothing was pushed or merged, and Milestone 2 has not started.

## Cleanup and final assessment

The runner closed connections, confirmed zero synthetic application records, stopped only its own PostgreSQL and Redis processes and removed its private cluster directory. A post-run process/directory check found no remaining resources from either test run. The temporary relocated PostGIS/native-library installation and the exact package archives downloaded for this task were also removed. No pre-existing service, database or volume was removed. Credential-free evidence is retained in the repository.

**No outstanding Milestone 1 blockers remain. Developer 1 Milestone 1 is ACCEPTED for final GitHub review.** Implementation and evidence are committed locally; no push or merge was performed, and Milestone 2 has not started.
