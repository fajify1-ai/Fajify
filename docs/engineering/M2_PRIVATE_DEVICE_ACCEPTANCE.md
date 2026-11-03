# M2 joint physical-device acceptance — 3 November 2026

**Merge readiness: NO-GO for PR #14 and PR #15. Neither PR is merged.**

Branch: `acceptance/m2-private-device`.

The acceptance branch combines main `9210c02`, Customer PR head `941b76b` and Business PR head `74f69c9` through ordinary merges. Original branches and attribution are preserved. The only new tracked implementation files are acceptance tooling/documentation, not modifications to either app or to the normal deployment configuration.

## Executed evidence

| Gate | Result |
| --- | --- |
| Frozen install with pinned pnpm 9.15.9 | PASS; no lockfile rewrite |
| Backend unit/regression suite | 175 passed, zero failed/skipped |
| Backend typecheck, lint, build | PASS |
| Customer web suite | 58 passed, zero failed/skipped |
| Customer web typecheck, production build | PASS |
| Harness security policy tests | 8 passed |
| Python/JavaScript syntax, whitespace, workspace structure | PASS |
| Keycloak, PostgreSQL, Tailscale runtime | NOT RUN: runtime prerequisites absent |
| Flutter/Android/device/email journeys | NOT RUN: SDK/device absent |

Total executed automated tests: **241 passed**. These ran in ChatGPT Work with Node 24.22.1. The documented Ubuntu run requires Node 22 and must repeat applicable checks. Previous PR developer-reported results are historical context and are not counted here.

Machine-readable [local evidence](../../tooling/device-acceptance/local-evidence.json) records inputs, commands, environment limitations and outstanding gates.

## Blocking findings

- **PR #15 on current main:** the real identity adapter discards approved memberships returned by `/auth/me`; `canAccessBusiness` therefore rejects approved merchants. This is a source-confirmed integration defect, not an observed device result. Repair and test the adapter before accepting B01/B06.
- **Both mobile signup flows:** a new Keycloak identity does not become an active application account. The backend requires explicit enrollment and approval; native adapters have no completed handoff. Do not count seeded login fixtures as registration acceptance.
- **Both PRs:** no real Android 15 evidence for browser handoff, callback, restore/refresh, logout, cancellation, email recovery/verification, suspension or tenant denial. No live harness run has passed yet.
- **PR #14 web scope:** confidential web client, TLS-backed durable encrypted session store and multi-instance browser acceptance remain separate uncompleted release gates. The native harness deliberately leaves web auth disabled.

The original Business acceptance document's statement that `/auth/me` lacks memberships is stale on current main. The backend contract now exists; the native adapter still needs to consume it. Realm import policy is not proof that the live server enforces it.

## Implemented harness

See the [complete Ubuntu and Android runbook](../../tooling/device-acceptance/README.md) for copy/paste commands, case matrix, diagnostics and cleanup. It prepares Keycloak **26.8.1**, separate ephemeral PostgreSQL services, a local mail sink, exact native callback/logout URIs, random synthetic credentials and private HTTPS through Tailscale Serve. All published Docker ports bind to loopback. No public cloud infrastructure is created and no Funnel is configured.

Source-level checks verify isolation policy, but Docker, proxy, image availability and device behavior are still unverified. Existing developer PRs, the realm source and database volumes are untouched. No GitHub Actions run was requested.

## Final sign-off conditions

Resolve the confirmed integration gaps, pin the final reviewed heads, repeat regressions, run the isolated PostgreSQL suite and live Keycloak checks, then complete and review every applicable Android/email/web case. Retain sanitized run source, image IDs, APK hashes and expected/actual case outcomes. Reconcile any main/PR head changes before sign-off. The tooling always reports device acceptance pending and cannot merge a PR.
