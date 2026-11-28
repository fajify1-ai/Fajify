# Private staging preparation

This configuration **does not deploy itself**. It publishes only loopback 8443 (TLS ingress) and 8025 (Mailpit). PostgreSQL/PostGIS, Redis, API and four Next.js services have no host ports. Do not change bindings to public addresses without separate authorization. No production credentials or data are supported.

## Prepare and review

1. `./prepare-local.sh` generates independent sandbox passwords, an auth secret, an SMS test secret, a 32-byte verification-encryption key and a three-day local TLS certificate. It refuses to overwrite existing secrets. `.secrets/` is host mode 0700 and excluded from Git **and Docker build contexts**. File secrets are readable inside only their assigned service containers. Keep `verification_encryption_key` stable across releases; losing it makes previously encrypted verification evidence unreadable. Use an approved secret manager and managed certificates for a real staging environment.
2. Copy `.env.example` to an ignored `.env`, choosing approved **sandbox** S3 and SMS webhook resources. `smtp_url` defaults to private Mailpit; replace it with approved transactional SMTP credentials when delivery acceptance is authorized. The SMS provider is a generic owned HTTPS webhook accepting `{phoneNumber, code, purpose}` and a bearer credential. It must not log codes and must enforce provider budgets. No provider account is provisioned or contacted by preparation.
3. Review `compose.yaml`, `api.Dockerfile`, `web.Dockerfile`, `read-secrets.mjs`, `init-db.sh` and `nginx.conf`. PostgreSQL creates a non-superuser migration owner and a distinct restricted runtime role. The DBA installs PostGIS. A one-shot migration job runs the full checksummed chain and marker-checked staging grants before API startup. The owner/DBA passwords are never mounted in API/web containers.
4. `docker compose --env-file .env -f compose.yaml config --quiet` validates configuration. `nginx -t` with the mounted sandbox TLS files validates ingress independently. Actual image builds and running the staging stack are separate acceptance steps; **no public deployment was performed**.

For a later authorized private staging session, from this directory:

```sh
docker compose --env-file .env -f compose.yaml build
docker compose --env-file .env -f compose.yaml up -d
```

Map `api.faji.test`, `customer.faji.test`, `admin.faji.test`, `business.faji.test` and `dispatch.faji.test` to the private host through approved local DNS/hosts configuration, then use HTTPS port 8443. Trust the test certificate only in the sandbox. Do not disable certificate verification in application code.

## Controls and acceptance gates

- Web cookies are host-only, HttpOnly, Secure and SameSite=Lax. All mutations require an exact approved web origin. The auth proxy validates its upstream, rejects redirects/oversized requests, forwards only auth cookies, recursively removes bearer credentials and sanitizes failures.
- `BETTER_AUTH_URL` is the owned HTTPS API endpoint; `FAJI_WEB_ORIGINS` lists exact browser origins only. The unified Customer/Business app accepts `https://preview.fajify.com` and `https://fajify.com`; both are explicitly trusted by the API and same-origin web proxy. Keep `https://admin-dev.fajify.com` in the API-only origin list for the separate Admin app. Do not add the API hostname as a trusted browser origin. Only the explicitly private API hop may use HTTP (`FAJI_ALLOW_INTERNAL_HTTP=true`). If using separate machines, replace it with TLS.
- The unified Next.js service has separate `FAJI_API_URL=http://api:3001` and `FAJI_WEB_ORIGIN=https://preview.fajify.com` settings. `FAJI_WEB_ORIGIN` remains the canonical fallback; mutation origins must exactly match the comma-separated `FAJI_WEB_ORIGINS` allowlist, and the proxy forwards the validated browser origin to the API. Do not copy `BETTER_AUTH_URL` into it. Staging self-registration is approved and the staging compose enables `FAJI_REGISTRATION_ENABLED=true`.
- Nginx trusts forwarded client addresses only from the host gateway (`172.30.88.1`) and overwrites forwarding headers before applying per-client auth/API budgets. Only the isolated, configured app-network CIDR is trusted by the API. Next.js accepts the ingress IP header only with `FAJI_TRUSTED_INGRESS=true`; never expose these Next.js ports directly. Keep the app-network subnet and gateway aligned with the Nginx trusted-proxy entry. When applying the same real-IP settings to a host-specific runtime override, preserve its custom Host and port routing instead of replacing it with this repository's default config.
- PostgreSQL and Redis stay on the isolated data network. Redis requires a mounted password and persists to a named volume. API secret loading happens at runtime; no secret is an image build argument. API/web containers run as the non-root Node user with read-only root filesystems and temporary cache mounts.
- Registration is enabled in the staging compose. Keep `FAJI_REGISTRATION_ENABLED=true` for staging acceptance and restore a policy gate only if registration is intentionally closed in a future environment. Identity import/claims and legacy-provider rollback are not release requirements.
- MFA remains optional for all roles. Admin mutations require recent explicit password proof; enrolled users must also prove their factor. The configured, verified Platform Admin owner can grant or revoke platform-admin access and assign any supported scope through the audited Admin Access screen. No second approver is required; other admins cannot grant privileges or change their own access. Keep `FAJI_PLATFORM_ADMIN_OWNER_EMAIL` aligned with the verified owner account in each environment.
- Validate image builds/startup, health endpoints, restricted grants, SMTP/SMS sandbox delivery, fresh/expired sessions, recovery, optional MFA, ingress budgets, DNS/TLS renewal, backups and restart behavior before declaring staging accepted. The local acceptance harness tests the same application over loopback TLS; it is not evidence that this entire container stack has been deployed.

Do not run `docker compose down -v` on a shared staging environment: it deletes persistent database/Redis volumes. Use `tooling/backup-rehearsal.sh` and the database backup/restore procedures; never replace persistent data as a routine code deployment step.
