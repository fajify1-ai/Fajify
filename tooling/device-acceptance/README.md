# Fajify PR #14 / #15 private Android acceptance

**Current decision: NO-GO.** The current checkout passes 175 API tests, 58 customer-web tests, 8 harness policy tests, 8 transport/HTTP tests, API typecheck/lint/build, and customer-web typecheck/build. The isolated database/Keycloak run did not complete: one PKCE check made an incorrect assumption about where Keycloak rejects a request; that check now verifies rejection at authorization or code exchange, but needs a fresh live run. Flutter analysis/tests, APK builds, Android 15, email journeys, private HTTPS edge, and confidential customer-web OIDC remain unverified. Do not merge either developer PR until every release gate below passes. Both developer heads are preserved as merge parents on `acceptance/m2-private-device`.

The current execution environment has Node 24.22.1 and the JavaScript project dependencies, but no Flutter SDK, Android SDK, adb, Docker, PostgreSQL or QEMU. The Android SDK manager stopped at Google's license prompt. No license was accepted. `/dev/kvm` is unavailable, so even an installed emulator would need slow software emulation. No service or public endpoint was started. The remaining laptop and Android setup commands are below.

## Reviewed source snapshot

| Source | Commit |
| --- | --- |
| Main, M8 Phase 1 | `9210c02bd4ddfd5a41c5906f35ef32a99e81e3bd` |
| PR #14 Customer | `941b76b7220ff15d178caff6546a82f4e0f3a8bb` |
| PR #15 Business | `74f69c9889455aed752ef197b757d787efd45fc8` |

The branch integrates these heads locally without changing either developer ref or main. A conflict-free integration is not authentication evidence.

## Review findings and merge blockers

1. **Business membership fix is implemented, pending Flutter execution:** the acceptance branch now validates `/auth/me.memberships` against approved business scopes, picks a returned membership, and checks the same subject/scope again before protected actions. A Dart unit test covers accepted, malformed, pending, wrong-type, and role-only entries. Flutter is unavailable here, so these changes still need analyze/test plus live API/device validation.
2. **Fresh signup now has an explicit pending-approval handoff, pending execution:** Customer and Business registration call `POST /auth/enroll`, which derives the subject from the verified token and provisions a suspended account. Both clients clear local tokens, end the Keycloak browser session, and report that approval is pending; neither treats registration as active access. Customer tests cover this behavior but await Flutter execution. Verify both journeys against live Keycloak and the API before acceptance.
3. **Realm runtime setup:** source has exact redirects, public clients, `faji-api` audience mapping, S256, disabled native password/implicit grants, email verification and recovery policies. It does not configure SMTP or explicit post-logout redirects. The isolated copy adds a local mail sink and exact logout redirects. Seed tooling reconciles Keycloak's default customer composite and binds the existing privileged password+OTP flow by runtime UUID. These changes never modify the checked-in realm or another server.
4. **Device evidence missing:** debug APK build/install, merged AppAuth receiver, Chrome Custom Tab login/state/nonce/callback, refresh/restore, logout/cancellation, email verification/recovery, suspension, membership revocation and cross-app regressions all need real Android 15 evidence. Neither previous PR-reported tests nor this branch's unit tests replace it.
5. **Customer web remains a separate release gate:** #14 includes Next.js authentication. The source realm has no confidential customer-web client. Its live confidential client, exact HTTPS callbacks, PostgreSQL TLS, encrypted durable session stores, multi-instance behavior and browser journeys are not provisioned by this native harness. Leave web authentication disabled until separately accepted. PR #14 must not be called fully accepted while this remains outstanding.
6. **Android scope:** Customer application ID `com.faji.app`, callback `com.faji.customer:/oauth/callback`; Business ID `dev.faji.faji_business`, callback `com.faji.business:/oauth/callback`. AppAuth provides the merged receiver, so verify the built manifests, not just source manifests. Business INTERNET permission currently comes from debug/profile manifests; release configuration requires separate review. Existing debug release-signing settings are not production release acceptance.
7. Business workflow screens remain sample fixtures; identity acceptance does not establish a live merchant operations implementation. iOS is outside this Android run and remains unverified.

## Isolation and transport

- Two **new PostgreSQL containers/clusters**, on separate identity/application networks. PGDATA is tmpfs, with no named/external database volumes. Unique random Compose namespace per run; no container names that could collide with normal development services. Neither the normal Compose file nor existing databases are opened or changed.
- Exact Keycloak image `quay.io/keycloak/keycloak:26.8.1`, production `start` command, HTTP only on the private Docker bridge and host loopback administrative port. Nginx exposes only `/realms/faji/`, `/resources/` and `/api/`; administration and master realm paths return 404 through the private edge. Query-string access logging is off.
- Tailscale Serve terminates ordinary certificate-verified HTTPS on the Ubuntu node's MagicDNS name. Both laptop and phone must be signed in to an approved private tailnet. No Funnel, router port forwarding, public ingress, insecure certificate flags, Android trust overrides or added user CA. Tailscale's HTTPS certificate issuance publishes the node DNS name in public certificate-transparency logs; it does not publish a public application endpoint.
- The identity/database internal links and local SMTP sink are plaintext inside this disposable host's bridge/loopback trust boundary. TLS is terminated at Serve, not disabled in either app. Native clients remain public S256 clients with no embedded secret. On the generated HTTPS config Business's existing local-HTTP escape is false; Customer always sets AppAuth insecure connections false.
- Synthetic users only (`@example.invalid`), locally captured mail only. No real mail provider, payment provider, S3 service, Redis worker or production credentials. API Redis/S3 config uses unused loopback placeholders; payment routes/workers are not exercised. Application runtime uses a distinct non-superuser login with table DML and no schema CREATE; fixture/migration administration uses the disposable application superuser. Identity and application DB credentials are different.
- Runtime secrets and config live in a generated mode-0700 `/tmp/fajify-device-*` directory, outside git. Do not upload `state.json`, Compose configuration, `fixtures.json`, mail content, raw logs or action URLs. They contain passwords or session links. Local machine administrators can inspect container environments; use a trusted laptop.
- `down` only targets the generated namespace; it never uses `down -v`, volume prune, system prune or a normal development Compose project. tmpfs data disappears on stop/restart, so always initialize a new run after cleanup. Keep only sanitized results.

## Ubuntu prerequisites

Use the already installed Docker and Flutter/Android SDK. Required: Docker Compose v2 with `up --wait`, Python 3, Node **22**, pnpm **9.15.9**, Flutter compatible with the checked-in lockfiles, JDK/Android SDK required by the existing Gradle files, adb, and Tailscale on Ubuntu and Android. Approximately 3 GiB of disposable DB/service capacity plus Node/Flutter build memory is needed; stop unrelated test workloads if necessary without deleting data.

Set up Tailscale interactively on both devices in the same approved tailnet; enable MagicDNS/HTTPS and restrict peer access to the testing devices using the tailnet's access policy. A node with existing Serve/Funnel configuration is refused: use a dedicated node or review its setup separately. Do not reset existing Serve settings. No cloud infrastructure or billable resources are created here.

## Exact preparation and regression commands

Run in a dedicated worktree so your current checkout is preserved:

```bash
cd ~/Desktop/project/Fajify
git fetch origin
git worktree add ../Fajify-device-acceptance origin/acceptance/m2-private-device
cd ../Fajify-device-acceptance
export FAJI_DEVICE_REPO="$PWD"
export PATH="$HOME/development/flutter/bin:$HOME/Android/Sdk/platform-tools:$PATH"
node --version
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm --version # must be 9.15.9
pnpm install --frozen-lockfile
python3 -m unittest discover -s tooling/device-acceptance -p 'test_*.py' -v
node --check tooling/device-acceptance/live.mjs
pnpm --filter @faji/api typecheck
pnpm --filter @faji/api lint
pnpm --filter @faji/api test
pnpm --filter @faji/api build
pnpm --filter @faji/customer-web typecheck
pnpm --filter @faji/customer-web test
pnpm --filter @faji/customer-web build
# Next generates this tracked declaration; restore only that build-generated change in this new worktree.
git diff -- apps/customer_web/next-env.d.ts
git restore -- apps/customer_web/next-env.d.ts
(
  cd apps/customer_mobile
  flutter pub get --enforce-lockfile
  flutter analyze
  flutter test --reporter expanded
)
(
  cd apps/business_mobile
  flutter pub get --enforce-lockfile
  flutter analyze
  flutter test --reporter expanded
)
git status --short # tracked source must still be clean
```

Never refresh lockfiles or change Gradle/TLS settings to bypass a failure. The runtime is pinned to Node 22; ChatGPT Work regression evidence used Node 24.22.1 and needs this laptop rerun on Node 22.

## Start isolated services and private HTTPS

Run in the worktree terminal above. Keep this terminal: `$FAJI_DEVICE_STATE` identifies this run and is deliberately not written into your repository.

```bash
docker compose version
tailscale status
tailscale serve status --json # must be empty; do not reset other services
export FAJI_DEVICE_HOSTNAME="$(tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
export FAJI_DEVICE_STATE="$(python3 tooling/device-acceptance/harness.py init --hostname "$FAJI_DEVICE_HOSTNAME")"
test -d "$FAJI_DEVICE_STATE" || exit 1
python3 tooling/device-acceptance/harness.py up --state "$FAJI_DEVICE_STATE"
python3 tooling/device-acceptance/harness.py database --state "$FAJI_DEVICE_STATE"
python3 tooling/device-acceptance/harness.py serve --state "$FAJI_DEVICE_STATE"
python3 tooling/device-acceptance/harness.py check --state "$FAJI_DEVICE_STATE"
cat "$FAJI_DEVICE_STATE/live-results.json"
```

Stop at any failure; do not continue to acceptance or merging. `up` waits up to 900 seconds for Keycloak. On startup failure it stops only its own containers. Create a new state for retry. Ports are selected dynamically; a bind collision fails rather than stopping an existing service. API container startup requires the compiled `apps/api/dist/main.js` and installed dependencies in this worktree. `image-evidence.txt` records the actual downloaded image IDs; version tags other than Keycloak are convenience dependencies and can change upstream, so retain those IDs with run evidence.

The `database` action runs the API PostgreSQL suite with distinct runtime/migration credentials against a uniquely named PostgreSQL-16 database marked `fajify:m2:disposable`. The existing branch-pinned milestone runners are not invoked; they target other worktrees. Latest milestone-wide database acceptance is a separate regression gate if client fixes change backend behavior.

The automatic live suite is **implemented but not yet executed** here. It checks both clients through real browser HTML forms and code exchange over verified HTTPS: missing/plain/wrong PKCE, native password-grant denial, code replay, real API bearer validation, ID/tampered-token rejection, default customer role, approved merchant membership, foreign-business denial, suspension, refresh, current-session revocation and IdP logout. It also denies a role-only merchant and a suspended fixture. It is not AppAuth/system-browser/device automation. Results always retain `mergeReady: false` because device/email/web gates are separate.

## Install and run on Android 15

For a software-emulated Android 15 target, the Android SDK licenses must first be reviewed and accepted interactively. The SDK manager will prompt for each license; do not pipe `yes` into it. API 35 is Android 15. Install the Android 36 compile platform used by the current Flutter toolchain and a Google Play API 35 image so Tailscale can be installed on the emulator:

```bash
export ANDROID_SDK_ROOT="$HOME/Android/Sdk"
export PATH="$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$PATH"
sdkmanager --sdk_root="$ANDROID_SDK_ROOT" --licenses
sdkmanager --sdk_root="$ANDROID_SDK_ROOT" \
  "platform-tools" "platforms;android-35" "platforms;android-36" \
  "emulator" "system-images;android-35;google_apis_playstore;x86_64"
avdmanager --sdk_root="$ANDROID_SDK_ROOT" create avd \
  --name Faji-Android-15 \
  --package "system-images;android-35;google_apis_playstore;x86_64"
```

Run this in its own terminal. Software emulation is slow and can take several minutes to boot. Sign Tailscale into the same approved private tailnet used by the test server, then confirm Android reports API 35 / Android 15 before running the APK commands below:

```bash
ANDROID_I_WANT_MY_TCG=yes emulator -avd Faji-Android-15 -accel off -no-snapshot -no-boot-anim
```

`sdkmanager --licenses` prompts for each package license, and emulator software acceleration requires opting in with `ANDROID_I_WANT_MY_TCG=yes`; these are documented Android SDK controls. See [SDK manager license acceptance](https://developer.android.com/tools/sdkmanager#accept-licenses) and [emulator command-line options](https://developer.android.com/studio/run/emulator-commandline#accel).

Unlock the phone, enable USB debugging and approve this laptop. Sign Android Tailscale into the same private tailnet. In Android Chrome open `https://YOUR_NODE.YOUR_TAILNET.ts.net/realms/faji/.well-known/openid-configuration`; require a valid certificate with no warning before continuing. A certificate warning is a hard failure, not a reason to bypass verification.

```bash
adb devices -l
adb shell getprop ro.build.version.release # expect 15
flutter devices
# Only one authorized Android device should be attached for these adb commands.
(
  cd "$FAJI_DEVICE_REPO/apps/customer_mobile"
  flutter build apk --debug --dart-define-from-file="$FAJI_DEVICE_STATE/customer.json"
)
(
  cd "$FAJI_DEVICE_REPO/apps/business_mobile"
  flutter build apk --debug --dart-define-from-file="$FAJI_DEVICE_STATE/business.json"
)
# With multiple devices, use adb -s SERIAL for each command instead.
adb install -r "$FAJI_DEVICE_REPO/apps/customer_mobile/build/app/outputs/flutter-apk/app-debug.apk"
adb install -r "$FAJI_DEVICE_REPO/apps/business_mobile/build/app/outputs/flutter-apk/app-debug.apk"
adb shell cmd package resolve-activity --brief -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'com.faji.customer:/oauth/callback'
adb shell cmd package resolve-activity --brief -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'com.faji.business:/oauth/callback'
adb shell monkey -p com.faji.app -c android.intent.category.LAUNCHER 1
```

Expected resolution is each package's AppAuth redirect activity. An artificial callback intent only checks receiver routing; it cannot prove a code exchange. Inspect the merged manifests under each app's `build/app/intermediates` too. `adb install -r` preserves existing app data; if a signing mismatch occurs, stop and use a separate Android test profile instead of uninstalling or clearing your existing app. Use only debug APKs and no release-signing changes.

Read credentials locally from `fixtures.json` (use an editor, do not paste the file into chat). Seeded users are `device_customer`, `device_merchanta`, `device_merchantb`, `device_nonmember` and `device_suspended`; all passwords are random. Test fixtures have verified email solely to isolate existing-account login. Registration and email actions require separate unverified accounts through the real browser forms.

## Required device evidence matrix

Record source SHA, APK SHA-256, Android build, app version, timestamp, case ID and observed result. Capture screenshots without passwords, QR codes, bearer values, code/state queries or email action links. Record both expected and actual result. All cases begin PENDING, and a failing case blocks the related PR.

| Case | Expected result / required evidence |
| --- | --- |
| C01/B01 existing-account login | System browser opens, HTTPS identity host, real S256 request, exactly one callback to the correct app, API account validation succeeds. Business currently has the membership parsing defect above. |
| C02/B02 cancellation and duplicate/wrong callback | Cancellation returns safely; random/replayed/mismatched state produces no session, no false success, no crash. Never copy a real code into logs. |
| C03/B03 restore and refresh | Force-stop and reopen; active account restores through API validation. Wait beyond the realm's 300-second access lifetime and confirm refresh plus subsequent authorized call. Reboot/locked-device restoration as appropriate. |
| C04/B04 logout | API session revoked and Keycloak browser session ended; reopen cannot restore. Logout cancel/network failure is visible and local credentials clear. Real refresh after provider logout denied. Automatic suite checks server grants only. |
| C05/B05 suspension | Sign in, suspend the matching fixture with command below, then resume app or navigate to a guarded screen; access denied without stale cached authorization. |
| B06 workspace membership | Approved A can access A; A cannot access B. Customer and nonmember cannot enter merchant workspace. Revoke A's membership while signed in; next protected operation denied. Role alone never grants ownership. |
| C07/B07 registration and verification | Register a new `@example.invalid` identity, verify using captured mail, complete password enrollment and confirm no access before verified email and authorized application onboarding. New business signup must not acquire merchant role/approval automatically. Current onboarding gap remains blocking. |
| C08/B08 recovery | Use browser forgot-password, capture reset email, complete password change, old password fails, new password succeeds; account suspension/membership policy still enforced. |
| C09/B09 offline/provider failure | Disable connectivity/cancel browser; no demo fallback, token exposure, blank screen or silent success. Restore network and recover normally. |
| R01 cross-app regression | Both apps coexist; customer redirect never opens Business and vice versa; logout/token storage do not cross apps; source tests and API/database tests rerun after fixes. |
| W01 separate customer web gate | Approved confidential client + exact callbacks, database TLS, durable encrypted stores across instances, configured login/logout/CSRF/recovery acceptance. This harness does not claim W01. |

Commands to manipulate **only the seeded synthetic fixtures**:

```bash
node tooling/device-acceptance/live.mjs control "$FAJI_DEVICE_STATE" customer suspend
node tooling/device-acceptance/live.mjs control "$FAJI_DEVICE_STATE" customer resume
node tooling/device-acceptance/live.mjs control "$FAJI_DEVICE_STATE" merchantA suspend
node tooling/device-acceptance/live.mjs control "$FAJI_DEVICE_STATE" merchantA resume
node tooling/device-acceptance/live.mjs control "$FAJI_DEVICE_STATE" merchantA membership-off
node tooling/device-acceptance/live.mjs control "$FAJI_DEVICE_STATE" merchantA membership-on
adb shell am force-stop com.faji.app
adb shell monkey -p com.faji.app -c android.intent.category.LAUNCHER 1
adb shell am force-stop dev.faji.faji_business
adb shell monkey -p dev.faji.faji_business -c android.intent.category.LAUNCHER 1
sha256sum apps/customer_mobile/build/app/outputs/flutter-apk/app-debug.apk apps/business_mobile/build/app/outputs/flutter-apk/app-debug.apk
```

After `resume`, allow a second and log in again: existing sessions remain invalidated by the suspension cutoff. Do not erase that cutoff. Recovery tests change passwords; use a new isolated run to rerun the automatic suite afterward.

Mailpit is only on laptop loopback. Find its URL without printing secrets:

```bash
python3 -c 'import json,os; c=json.load(open(os.environ["FAJI_DEVICE_STATE"]+"/state.json")); print("http://127.0.0.1:"+str(c["ports"]["mail"]))'
```

Open that URL on the laptop; do not forward it publicly. For email action continuation on Android, transfer only the test action link privately to the same phone browser session and record whether the app callback resumes. Opening a link on the laptop is not proof of same-device continuation. Never paste action links into GitHub/chat or disable verification to complete the case. New-account approval policy must be resolved before successful signup can be accepted; do not manufacture an automatic pass by editing production-like policy.

## Evidence and cleanup

Save sanitized `live-results.json`, `source.json`, `image-evidence.txt`, regression summaries and device case results outside the temporary directory before ending the run. No secrets or raw Mailpit output in GitHub. This source-tested harness is not a claim that these services have started successfully on Ubuntu.

```bash
cd "$FAJI_DEVICE_REPO"
python3 tooling/device-acceptance/harness.py down --state "$FAJI_DEVICE_STATE"
tailscale serve status
```

Cleanup refuses to remove a Serve configuration that changed since this harness created it. Inspect that situation before disabling anything; independently stop only this run's Compose project if necessary. Never run a global reset/prune. State remains private for local review and may be removed after retaining sanitized evidence; do not reuse it after tmpfs databases are destroyed.

**Final gate:** no merge until the Business defect and signup handoff are resolved, both exact final heads plus current main are retested, live server/database acceptance passes, all applicable Android/email/web cases have reviewed evidence, regressions pass and final reviewer sign-off is recorded. No script here requests or performs a merge.

References: [Keycloak reverse proxy](https://www.keycloak.org/server/reverseproxy), [Keycloak hostname](https://www.keycloak.org/server/hostname), [Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve), [private Docker hosting](https://tailscale.com/docs/solutions/host-private-server-docker).
