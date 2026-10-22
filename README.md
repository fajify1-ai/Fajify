# Fajify

Faji is a multi-platform lifestyle and experiences platform covering discovery, bookings, merchant operations and ride/dispatch.

## Engineering monorepo

| Workspace | Role |
| --- | --- |
| `apps/customer_mobile` | **Imported** Flutter customer application |
| `apps/business_mobile` | Business Flutter app — foundation planned |
| `apps/ride_dispatch` | Single Driver/Dispatcher Flutter app — foundation planned |
| `apps/customer_web` | Next.js public web — foundation planned |
| `apps/admin_web` | Next.js admin web — foundation planned |
| `apps/api` | NestJS modular monolith on Node.js — foundation planned |
| `apps/worker` | Redis/BullMQ workers — foundation planned |
| `packages` | Shared Flutter/TypeScript modules — foundation planned |
| `infrastructure` | Docker, database, Keycloak, IaC and deployment |
| `docs` / `tests` / `tooling` | Specifications, checks and scripts |

**Target stack:** Flutter/Dart, Next.js/TypeScript, NestJS/Node.js, PostgreSQL/PostGIS, Keycloak (OIDC/PKCE), Redis/BullMQ, and Paystack or Flutterwave.

## Customer app migration

The legacy customer application was imported from [Faith-loves/Faji](https://github.com/Faith-loves/Faji) at pinned commit `b96cc1f294095627b8d2047647505de881fa2e4e`. All **287 tracked files** were imported byte-for-byte into `apps/customer_mobile/` and independently verified against the original Git tree SHA `f4fc4ad64ede410a2f61ce281905a9a895285407`.

**Important:** File and tree content are preserved; the original upstream commit object/ancestry is **not** present in this repository. Original attribution and validation instructions are in [migration notes](docs/migration/IMPORT.md). The existing app still uses Firebase and is not yet upgraded to the proposed Keycloak/NestJS/PostgreSQL platform.

This feature branch is for review; Flutter build/test acceptance and rights/configuration review are required before merging.
