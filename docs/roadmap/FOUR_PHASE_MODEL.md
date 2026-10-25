# Fajify — Four-Phase Delivery Model

**Standard:** Every engineering milestone (M1–M9) has exactly **four parallel delivery phases**. Phase numbers are scoped to a milestone: `M2-P1` means Milestone 2, Phase 1. They are **workstreams, not chronological project stages**; phases may proceed concurrently once contracts and prerequisites are available.

| Phase | Responsibility | Primary source ownership |
| --- | --- | --- |
| **Phase 1 — Backend & Platform** | API, data, identity, integrations, infrastructure, security | `apps/api/`, `apps/worker/`, `packages/database/`, `packages/api_contracts/`, `infrastructure/` |
| **Phase 2 — Customer & Frontend** | Customer Flutter/web, customer journeys, UI, tests | `apps/customer_mobile/`, `apps/customer_web/`, shared Flutter/web UI |
| **Phase 3 — Faji Business** | Business Flutter, merchant operations, merchant finance UI | `apps/business_mobile/` |
| **Phase 4 — Ride, Dispatch & Operations** | Driver/dispatcher Flutter and operational administration UX | `apps/ride_dispatch/`, `apps/admin_web/` with Phase 1 on admin contracts |

Owners are people or teams assigned to a **phase**; the label is not an employee identifier. `Phase 3` and `Phase 4` replace the formerly subdivided Business/Mobility allocation for planning, not the domain architecture. Administration UI belongs to Phase 4; privileged APIs and authorization belong to Phase 1.

## Nine milestones × four phases (36 delivery cells)

| Milestone | Phase 1 — Backend & Platform | Phase 2 — Customer & Frontend | Phase 3 — Business | Phase 4 — Ride, Dispatch & Operations |
| --- | --- | --- | --- | --- |
| **M1 — Foundation** | NestJS API, Postgres/PostGIS, workspace/infrastructure | Flutter customer migration, shared UI, customer web shell | Business scaffold and navigation | Combined Ride/Dispatch scaffold, admin web shell |
| **M2 — Identity & Security** | Keycloak, auth contracts, roles/memberships, server authorization | Customer mobile/web OIDC, registration, sessions | Business OIDC, merchant scopes, access gating | Driver/dispatcher OIDC, role separation, admin authentication |
| **M3 — Business** | Merchant schema/APIs and transactional rules | Customer-facing venue widgets and contract integration | Merchant onboarding, catalogue, reservations, orders, reporting | Admin approval and merchant-governance UI under Phase 1 contracts |
| **M4 — Customer** | Discovery, booking and ordering APIs | Customer Flutter/web discovery, plans, reservations, ordering | Merchant/customer booking & order status integration | Operational handling/escalation UI and cross-domain readiness |
| **M5 — Payments** | Gateway, verified webhooks, ledger, payout/refund rules | Checkout, paid booking and ticket UX | Merchant earnings, settlements, payout views | Admin finance/dispute operations; Ride earnings integration fixtures |
| **M6 — Planning** | Recommendation/eligibility engine and plan APIs | Plan for Me, Browse Plans, recommendations UX | Merchant packages, schedules, experience configuration | Administration of curated experiences and operational exceptions |
| **M7 — Ride & Dispatch** | Dispatch, trip/location, safety and fare APIs | Customer ride requests and tracking | Ride/order/business handoff, pickup coordination | Driver/dispatcher flows, GPS, dispatch, earnings, safety |
| **M8 — Admin & Integration** | Admin APIs, auditing, integration and monitoring | Cross-platform customer workflows | Merchant integration/operations | Admin dashboard, support, incident and operational workflows |
| **M9 — Production & Launch** | Backend/security/performance/restore/deployment verification | Customer mobile/web E2E, accessibility, releases | Business app E2E and merchant pilot readiness | Ride/dispatch device/location E2E and operations pilot readiness |

These allocations are **delivery responsibilities**, not proof of completion. Scope and acceptance remain in [MILESTONES.md](../engineering/MILESTONES.md); the original subsection numbers (e.g. 2.1–2.6) are **technical work packages**, not additional phases.

## Naming and contributions

- Milestone/phase identity: `M1-P1`, `M1-P2`, `M1-P3`, `M1-P4`; `M2-P1` … `M9-P4`.
- Branches: `feat/m2-p1-keycloak-auth`, `feat/m2-p2-customer-auth`, `feat/m2-p3-business-auth`, `feat/m2-p4-ride-dispatch-auth`; equivalent `fix/`, `docs/`, `test/` prefixes as appropriate.
- Pull request titles: `M2 · Phase 1 · Keycloak identity and authorization`.
- PR bodies and acceptance reports must state milestone/phase ID, affected modules, dependent contracts, tests and device evidence, security/rollback concerns, review/approval and outstanding blockers.
- **Do not rename or rewrite historical commits, authors, existing branches, merged PRs, evidence logs, or dated acceptance records.** Historical identifiers such as `d1`, `Developer 3A`, and `DEVELOPER_1_M1_ACCEPTANCE.md` remain valid evidence references. New documentation uses phase labels and links back to historical evidence as needed.
- Never replace the original contributor attribution with a phase label; Git author and review history remain attributable to individuals.

## Delivery gate

Each phase requires implemented code, reproducible checks, negative/security cases where relevant, contract compatibility, and a reviewed PR. A milestone is accepted only after its four phase deliveries and shared integration acceptance have cleared; a dependency can be recorded as blocked without incorrectly marking a milestone done.
