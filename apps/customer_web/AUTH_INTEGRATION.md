# Customer web authentication

Better Auth is hosted by NestJS with PostgreSQL/Drizzle. This Next.js app uses the shared `packages/web_auth` client, fixed-upstream cookie proxy and backend-validated protected routes. All login, registration, recovery, phone and optional MFA forms are in-app. No external identity provider is required.

Set `FAJI_API_URL` and the exact `FAJI_WEB_ORIGIN`; HTTPS is mandatory outside local development. See [implementation](../../docs/engineering/BETTER_AUTH_IMPLEMENTATION.md), [private staging](../../infrastructure/deployment/staging/README.md) and [merge verification](../../docs/engineering/BETTER_AUTH_MERGE_READINESS.md). Historical adapter evidence is not current setup guidance.
