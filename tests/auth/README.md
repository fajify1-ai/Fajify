# Private authentication acceptance

Only use synthetic accounts and the disposable database checks described in the migration/release runbooks. The fixture server refuses unmarked databases and `NODE_ENV` other than `test`. It binds to loopback, exposes a secret-protected fixture endpoint for synthetic role/suspension/expiry decisions, and is **never** a deployment service.

## Browser: four applications with real TLS cookies

Prerequisites: pinned pnpm, Chromium, Python Playwright (`pip install -r tests/auth/requirements.txt`), a migrated/marked PostgreSQL 16/PostGIS database with separate owner/runtime grants, and private Mailpit (SMTP 11025, HTTP 18025).

1. Export `FAJI_DATABASE_URL`, `FAJI_RUNTIME_DATABASE_URL`, `FAJI_DISPOSABLE_DATABASE`, `NODE_ENV=test`, and a random `FAJI_FIXTURE_SECRET` (at least 32 characters). Set `BETTER_AUTH_SECRET` to a fresh disposable secret, `BETTER_AUTH_URL=https://api.localhost:3443`, `SMTP_URL=smtp://127.0.0.1:11025`, and `FAJI_WEB_ORIGINS=https://customer.localhost:4440,https://admin.localhost:4441,https://business.localhost:4442,https://dispatch.localhost:4443`.
2. Run `pnpm --filter @faji/api exec tsx scripts/auth-acceptance-server.ts`. API is loopback 3101, sandbox SMS sink is 3111. Never run it against staging or production data.
3. After all four production builds, run `node tooling/prepare-web-standalone.mjs` from the repository root to copy static/public assets beside standalone servers (Dockerfiles do this during packaging). Start Customer/Admin/Business/Ride Next.js apps on **loopback** ports 3000/3002/3003/3004. Each app needs `FAJI_API_URL=http://127.0.0.1:3101` and its own exact HTTPS `FAJI_WEB_ORIGIN` from the preceding list. Use `pnpm --filter <workspace> dev --hostname 127.0.0.1` or standalone outputs with `HOSTNAME=127.0.0.1 PORT=<port>` and `FAJI_ALLOW_INTERNAL_HTTP=true` for the private hop.
4. Generate a disposable self-signed certificate under ignored `work/` and run `python tests/auth/private_tls_proxy.py --cert work/test.crt --key work/test.key`. Its five listeners bind only 127.0.0.1. Test browsers explicitly trust this disposable certificate; application TLS verification is not disabled.
5. Run `python tests/auth/browser_acceptance.py` with the same fixture secret. It registers unique `@example.test` users, checks HTTP status/rendering/data boundaries, and exercises login/logout/recovery/reset/replay/expiry, cookie flags, role/suspension isolation, MFA enrollment/recovery, password/factor step-up and verified phone enrollment across all four apps. Session fixation and nested token leakage are checked. It does not send real SMS or email.

The database fixture resets IP limiter counters between independent application scenarios. Abuse quotas are tested separately by `auth-security-acceptance.ts`; resetting a fixture quota is not evidence of a production bypass.

## Native applications

Executed host tests use Flutter's test runner and **mock platform storage**. They do not prove Android Keystore/iOS Keychain encryption, app lifecycle behavior on a device, signing, or platform TLS trust. The available environment had no Android SDK/emulator and no physical mobile device, so no device test is reported as passed.

On an approved emulator/device, each app has a real storage/transport integration test:

```sh
flutter devices
cd apps/customer_mobile # repeat for business_mobile and ride_dispatch
flutter pub get
flutter test integration_test/native_better_auth_acceptance_test.dart \
  -d emulator-5554 --dart-define=API_BASE_URL=https://APPROVED-PRIVATE-DISPOSABLE-API \
  --dart-define=FAJI_FIXTURE_SECRET="$PRIVATE_FIXTURE_SECRET"
```

The target must be the private acceptance fixture with its disposable marker/secret preflight; ordinary staging or production API targets are rejected before registration. It must allow synthetic registration and must never contain production users. The test generates its own temporary account/password in memory, verifies actual platform secure storage, restores through a second client, revokes remotely and checks that replay of the saved token is rejected. Clean up the disposable fixture after the test. Configure a properly trusted certificate/DNS for the device; do not add an application-wide TLS bypass.

Also manually test all three embedded UIs on Android and iOS: registration/login/logout, background/resume, dropped connections, SMS delivery/expiry/retries, email and phone recovery, optional authenticator enrollment, recovery-code use/regeneration, factor/phone revocation and privileged step-up where authorized. Use the private SMTP/SMS sandbox and approved role fixtures. These manual/device checks remain release gates until executed.
