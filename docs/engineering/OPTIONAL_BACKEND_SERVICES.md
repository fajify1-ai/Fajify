# Optional external services for the prelaunch API

This branch adds explicit opt-outs; **neither opt-out should be inferred from missing credentials**.

- `FAJI_EMAIL_DELIVERY_ENABLED=false`: Better Auth does not create an SMTP transport. Password reset and email verification are unavailable; do not advertise either flow as available. The default is `true`, preserving the staging/production requirement for `SMTP_URL` and `AUTH_EMAIL_FROM`.
- `FAJI_RIDE_STORAGE_ENABLED=false`: the API configuration no longer requires `S3_ENDPOINT` or `S3_BUCKET`; Ride document uploads and verification fail with HTTP 503. Default is `true`, preserving the existing HTTPS S3 requirement in staging/production.
- SMS remains unconfigured unless a real approved webhook is supplied; its existing callback fails closed. Do not simulate delivery.

## Deployment boundary

The existing private staging Compose file still requires `S3_ENDPOINT`, `S3_BUCKET` and an SMS webhook at interpolation time. It is **not** a deployment template for the optional-services configuration. Do not edit or restart the active staging project to work around these guards.

A separate deployment manifest and acceptance checks are required before routing `api.fajify.com` to this backend. Test environment parsing, email-disabled registration/sign-in/recovery behavior, storage-denied endpoints, authentication origin restrictions, migrations and backup/restore before accepting real registrations.

No DNS, TLS, Docker, migration or public deployment changes are included in this branch.
