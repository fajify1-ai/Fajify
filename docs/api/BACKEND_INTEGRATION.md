# Developer 1 — backend integration contract (M1)
- Base URL: `/api/v1`; JSON UTF-8, ISO 8601 UTC timestamps, UUID resource IDs.
- `GET /api/v1/health` is liveness; `GET /api/v1/health/ready` is database readiness (503 on DB failure).
- All responses include `x-request-id`; clients can send a 1–64 character alphanumeric, underscore or hyphen correlation ID.
- Error envelope: `{"error":{"code":"...","message":"...","requestId":"..."}}`; never parse human-readable message for program logic.
- Identity is the immutable Keycloak `sub` claim. M2 will implement JWT JWKS signature, issuer, audience, expiry, scopes and resource membership verification; M1 verifier deliberately rejects all tokens.
- Mobile: OAuth 2.0 authorization code + PKCE; websites: server-side OIDC sessions; do not embed secrets in client builds.
- Do not integrate speculative booking, payment, merchant or dispatch endpoints; contracts will be published by domain owners as modules become functional.
- OpenAPI at `/api/docs` outside production; generate snapshot with `pnpm --filter @faji/api contracts`.
- Background notification jobs are infrastructure-only and fail closed until a delivery adapter exists; use outbox for atomic publication with business writes.
