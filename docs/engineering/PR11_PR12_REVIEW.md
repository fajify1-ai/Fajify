# Backend PR review: membership identity and M3 closure

Reviewed against merged main `2c64b47267d866ec93f6428a9ebe3fd66f70456f`.

PR #12 (`test/m3-p1-final-closure`) is a test/tooling/documentation follow-up. Its new
PostgreSQL race deliberately proves that an in-flight branch-grant share lock prevents
revocation overtaking that transaction, then proves denial after revocation. It does not
change runtime authorization. Review found its original disposable wrapper still used
pre-M4/M5 grants, omitted the denied Keycloak sentinel, and could delete a cluster even if
shutdown failed. The updated wrapper uses the accepted strict runner/report design and
current enumerated runtime grants. Replay compares the entire migration history,
checksums and applied timestamps. Capacity/isolation checks now emit TAP. The full
inherited M4/M5 regression suites remain in the local gate. Marked M3 test databases are
explicitly allowed in those fixtures; server-side disposable-marker/PG16 assertions remain.

PR #11 (`fix/m2-business-memberships-contract`) depends on #12 for this consolidated
verification. Its branch includes the reviewed closure commit and current main, preserving
both original histories. The only runtime change is the additive `/auth/me.memberships`
projection: signed subject, active membership, approved business and unsuspended access/
profile are required. Realm roles never create a workspace grant. `subject` and `roles`
remain unchanged; other merchant APIs still authorize the selected tenant independently.

The approved business entry contract is:

```json
{"resourceType":"business","resourceId":"<business UUID>","role":"owner","status":"approved"}
```

A real PostgreSQL/HTTP scenario now verifies subject isolation, pending/rejected business
exclusion, branch-only exclusion, revoked membership, access/profile suspension, ordinary
role without membership, and the signed-subject response despite a forged subject query.
Strict membership test compilation is included. No new migration, grants, provider call,
UI change, credential or live deployment is introduced by this membership projection.
The generated contract snapshot must remain unchanged through this additive response
implementation (the existing identity route has an unconstrained response schema).

## Consolidated local gate

From the current `fix/m2-business-memberships-contract` branch, clean and fully updated:

```bash
corepack pnpm install --frozen-lockfile
bash tooling/run-m3-p1-disposable.sh
```

The runner uses generated credentials and one isolated PostgreSQL 16/PostGIS/pg_trgm
cluster with separate owner/runtime roles and a denied Keycloak sentinel. It covers types,
lint/build, all migrations twice, restricted grants, foundation/API/M3/M4/M5 tests, the
strict reporter, query plans, OpenAPI equality, dependency audit and unchanged source.
Reports persist under `/tmp/fajify-m3-report.*`. A cleanup failure forces FAIL. This host
has no PostgreSQL server; prepared PostgreSQL scenarios have not been reported as passed.
The previous M5 acceptance covers its original source, not these new changes.

After reviewing a passing report bound to the exact combined head, merge #12 first and
#11 second, checking both heads have not moved. The combined source includes both PRs,
so the final merged tree can be compared directly with the locally verified tree.

PRs #14 and #15 are conflict-free but retain uncompleted physical-device/live-OIDC
acceptance requirements. This review does not mark those flows passed or merge their
client implementations. Keep those PRs open until the applicable evidence is available.

Engineering review checks here pass: 141 API tests that do not require PostgreSQL, with
no failures/skips/TODOs; strict API/M3/M4/M5/membership test types; API lint/build; four
reporter self-tests; shell syntax and whitespace; and unchanged OpenAPI snapshot. The
PostgreSQL runner is prepared, not executed in this host. The local report is required
before the reviewed backend PRs can be merged with the same confidence as M5.
