# Deprecated — historical Keycloak infrastructure

**Status: retired from the target architecture. Do not deploy or configure Keycloak for new Faji work.**

The files in this directory are retained solely as historical migration and acceptance evidence. They are not current setup instructions, and existing realm JSON must not be used for new environments. The approved replacement is application-hosted Better Auth, primarily integrated with NestJS, using the Faji PostgreSQL database. Login, registration, password recovery, phone OTP, logout and session management remain inside each Faji app with no external browser/hosted login redirect. NestJS validates sessions/tokens and enforces resource-scoped authorization. See `docs/architecture/SYSTEM_ARCHITECTURE.md` and `docs/engineering/MILESTONES.md`.
